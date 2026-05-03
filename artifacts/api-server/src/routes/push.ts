import { Router } from "express";
import type { IRouter, Request, Response } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? "https://ppokdtzlisaxsrmtwlrb.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

// ── Verify Supabase JWT and return caller's user ID ───────────────────────

async function verifyJwt(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    const json: unknown = await res.json();
    if (typeof json === "object" && json !== null && "id" in json) {
      const id = (json as Record<string, unknown>).id;
      return typeof id === "string" ? id : null;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Authorization: caller must share a booking with the target user ────────
// Prevents any authenticated user from spamming arbitrary users.

async function callerMayNotify(callerId: string, targetUserId: string): Promise<boolean> {
  if (callerId === targetUserId) return true;
  if (!SUPABASE_SERVICE_KEY) return false;
  const url =
    `${SUPABASE_URL}/rest/v1/bookings` +
    `?select=id` +
    `&or=(and(customer_id.eq.${encodeURIComponent(callerId)},provider_id.eq.${encodeURIComponent(targetUserId)}),` +
    `and(provider_id.eq.${encodeURIComponent(callerId)},customer_id.eq.${encodeURIComponent(targetUserId)}))` +
    `&limit=1`;
  try {
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) return false;
    const rows: unknown = await res.json();
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

// ── Fetch Expo push tokens for a user (service key bypasses RLS) ──────────

async function fetchPushTokens(userId: string): Promise<string[]> {
  if (!SUPABASE_SERVICE_KEY) {
    logger.warn("push: SUPABASE_SERVICE_ROLE_KEY not set");
    return [];
  }
  const url = `${SUPABASE_URL}/rest/v1/push_tokens?select=token&user_id=eq.${encodeURIComponent(userId)}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    logger.error({ status: res.status, userId }, "push: token fetch failed");
    return [];
  }
  const rows: unknown = await res.json();
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null)
    .map((r) => r.token)
    .filter((t): t is string => typeof t === "string" && t.length > 0);
}

// ── POST /api/push ─────────────────────────────────────────────────────────
// Requires: Authorization: Bearer <supabase-access-token>
// Caller must share a booking with the target userId.

router.post("/push", async (req: Request, res: Response) => {
  const callerId = await verifyJwt(req.headers.authorization);
  if (!callerId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const { userId, title, body, data, categoryIdentifier, channelId } =
    (req.body ?? {}) as Record<string, unknown>;

  if (typeof userId !== "string" || !userId ||
      typeof title !== "string" || !title ||
      typeof body !== "string" || !body) {
    res.status(400).json({ error: "userId, title, and body are required" });
    return;
  }

  const allowed = await callerMayNotify(callerId, userId);
  if (!allowed) {
    logger.warn({ callerId, targetUserId: userId }, "push: no shared booking — blocked");
    res.status(403).json({ error: "forbidden" });
    return;
  }

  try {
    const tokens = await fetchPushTokens(userId);
    if (!tokens.length) {
      logger.info({ callerId, targetUserId: userId }, "push: no tokens for target user");
      res.json({ sent: 0, total: 0, message: "no tokens" });
      return;
    }

    const resolvedChannel =
      typeof channelId === "string" && channelId
        ? channelId
        : categoryIdentifier === "new_booking"
        ? "new_booking"
        : categoryIdentifier === "booking_update"
        ? "booking_status"
        : "default";

    const messages = tokens.map((token) => ({
      to: token,
      title,
      body,
      data: (typeof data === "object" && data !== null ? data : {}) as Record<string, unknown>,
      sound: "default",
      priority: "high",
      channelId: resolvedChannel,
      ...(typeof categoryIdentifier === "string" && categoryIdentifier
        ? { categoryId: categoryIdentifier }
        : {}),
    }));

    const pushRes = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages),
    });

    const pushJson: unknown = await pushRes.json().catch(() => null);
    const results =
      typeof pushJson === "object" &&
      pushJson !== null &&
      "data" in pushJson &&
      Array.isArray((pushJson as Record<string, unknown>).data)
        ? ((pushJson as Record<string, unknown>).data as unknown[])
        : [];
    const successCount = results.filter(
      (d) => typeof d === "object" && d !== null && (d as Record<string, unknown>).status === "ok",
    ).length;

    logger.info(
      { callerId, targetUserId: userId, sent: successCount, total: tokens.length },
      "push: delivered",
    );
    res.json({ sent: successCount, total: tokens.length });
  } catch (e) {
    logger.error({ err: e }, "push: send failed");
    res.status(500).json({ error: "push send failed" });
  }
});

export default router;
