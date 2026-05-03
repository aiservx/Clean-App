import { Router, type IRouter } from "express";
import type { Request, Response } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? "https://ppokdtzlisaxsrmtwlrb.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? SUPABASE_ANON_KEY;

// ── JWT verification via Supabase auth ────────────────────────────────────
// Returns the authenticated user's ID, or null if the token is invalid.

async function verifySupabaseJwt(authHeader: string | undefined): Promise<string | null> {
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
    const user: { id?: string } = await res.json().catch(() => ({}));
    return user?.id ?? null;
  } catch {
    return null;
  }
}

// ── Token lookup (uses service role key to bypass RLS) ────────────────────

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
  const rows: { token: string }[] = await res.json().catch(() => []);
  return rows.map((r) => r.token).filter(Boolean);
}

// ── POST /api/push ─────────────────────────────────────────────────────────
// Requires: Authorization: Bearer <supabase-access-token>
// Body: { userId, title, body, data?, categoryIdentifier?, channelId? }

router.post("/push", async (req: Request, res: Response) => {
  const callerId = await verifySupabaseJwt(req.headers.authorization);
  if (!callerId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const { userId, title, body, data, categoryIdentifier, channelId } =
    req.body ?? {};

  if (!userId || !title || !body) {
    res.status(400).json({ error: "userId, title, and body are required" });
    return;
  }

  try {
    const tokens = await fetchPushTokens(userId as string);

    if (!tokens.length) {
      logger.info({ callerId, targetUserId: userId }, "push: no tokens for target user");
      res.json({ sent: 0, total: 0, message: "no tokens" });
      return;
    }

    const resolvedChannel =
      (channelId as string | undefined) ??
      (categoryIdentifier === "new_booking"
        ? "new_booking"
        : categoryIdentifier === "booking_update"
        ? "booking_status"
        : "default");

    const messages = tokens.map((token) => ({
      to: token,
      title,
      body,
      data: (data as Record<string, unknown>) ?? {},
      sound: "default",
      priority: "high",
      channelId: resolvedChannel,
      ...(categoryIdentifier ? { categoryId: categoryIdentifier } : {}),
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

    const pushJson: { data?: { status: string }[] } | null = await pushRes
      .json()
      .catch(() => null);
    const successCount = (pushJson?.data ?? []).filter((d) => d?.status === "ok").length;

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
