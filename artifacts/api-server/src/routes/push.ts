import { Router } from "express";
import type { IRouter, Request, Response } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? "https://mffdpjwtwseftaqrslgx.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mZmRwand0d3NlZnRhcXJzbGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3OTY1MDAsImV4cCI6MjA5MzM3MjUwMH0.nDIPN8836RZ-37eKDTCL7-GrBE0tAus6V58qVyopZd8";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!SUPABASE_SERVICE_KEY) {
  logger.warn("SUPABASE_SERVICE_ROLE_KEY is not set — push notifications will fail. Set it in environment secrets.");
}

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

// ── Check if caller has admin role ────────────────────────────────────────

async function callerIsAdmin(callerId: string): Promise<boolean> {
  if (!SUPABASE_SERVICE_KEY) return false;
  const url = `${SUPABASE_URL}/rest/v1/profiles?select=role&id=eq.${encodeURIComponent(callerId)}&limit=1`;
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
    return Array.isArray(rows) && rows.length > 0 && (rows[0] as Record<string, unknown>).role === "admin";
  } catch {
    return false;
  }
}

// ── Authorization: caller must share a booking with target, be admin, or be
//    the booking owner notifying an available provider for that booking ──────

async function callerMayNotify(
  callerId: string,
  targetUserId: string,
  categoryIdentifier?: unknown,
  bookingId?: unknown,
): Promise<boolean> {
  if (callerId === targetUserId) return true;
  if (!SUPABASE_SERVICE_KEY) return false;

  if (await callerIsAdmin(callerId)) return true;

  // For new_booking notifications the caller must prove ownership of a real
  // pending booking.  bookingId is required; we verify user_id === callerId
  // and status is pending/available, and confirm target is an available provider.
  if (categoryIdentifier === "new_booking") {
    if (typeof bookingId !== "string" || !bookingId) return false;
    const bookingUrl =
      `${SUPABASE_URL}/rest/v1/bookings` +
      `?select=id,status` +
      `&id=eq.${encodeURIComponent(bookingId)}` +
      `&user_id=eq.${encodeURIComponent(callerId)}` +
      `&status=in.(pending,available)` +
      `&limit=1`;
    try {
      const bookingRes = await fetch(bookingUrl, {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          Accept: "application/json",
        },
      });
      if (!bookingRes.ok) return false;
      const bookingRows: unknown = await bookingRes.json();
      if (!Array.isArray(bookingRows) || bookingRows.length === 0) return false;
    } catch {
      return false;
    }
    const provUrl =
      `${SUPABASE_URL}/rest/v1/providers` +
      `?select=id&id=eq.${encodeURIComponent(targetUserId)}&available=eq.true&limit=1`;
    try {
      const provRes = await fetch(provUrl, {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          Accept: "application/json",
        },
      });
      if (!provRes.ok) return false;
      const provRows: unknown = await provRes.json();
      return Array.isArray(provRows) && provRows.length > 0;
    } catch {
      return false;
    }
  }

  const url =
    `${SUPABASE_URL}/rest/v1/bookings` +
    `?select=id` +
    `&or=(and(user_id.eq.${encodeURIComponent(callerId)},provider_id.eq.${encodeURIComponent(targetUserId)}),` +
    `and(provider_id.eq.${encodeURIComponent(callerId)},user_id.eq.${encodeURIComponent(targetUserId)}))` +
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

// ── Send to Expo Push API with up to `maxAttempts` retries ────────────────

type ExpoMessage = {
  to: string;
  title: unknown;
  body: unknown;
  data: Record<string, unknown>;
  sound: string;
  priority: string;
  channelId: string;
  categoryId?: string;
};

async function sendToExpoWithRetry(messages: ExpoMessage[], maxAttempts: number): Promise<number> {
  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt++;
    try {
      const pushRes = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
        },
        body: JSON.stringify(messages),
      });
      if (!pushRes.ok) {
        logger.warn({ status: pushRes.status, attempt }, "push: Expo API non-OK, retrying");
        if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, 500 * attempt));
        continue;
      }
      const pushJson: unknown = await pushRes.json().catch(() => null);
      const results =
        typeof pushJson === "object" &&
        pushJson !== null &&
        "data" in pushJson &&
        Array.isArray((pushJson as Record<string, unknown>).data)
          ? ((pushJson as Record<string, unknown>).data as unknown[])
          : [];
      return results.filter(
        (d) => typeof d === "object" && d !== null && (d as Record<string, unknown>).status === "ok",
      ).length;
    } catch (e) {
      logger.warn({ err: e, attempt }, "push: Expo API error, retrying");
      if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
  return 0;
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

  const { userId, title, body, data, categoryIdentifier, channelId, bookingId } =
    (req.body ?? {}) as Record<string, unknown>;

  if (typeof userId !== "string" || !userId ||
      typeof title !== "string" || !title ||
      typeof body !== "string" || !body) {
    res.status(400).json({ error: "userId, title, and body are required" });
    return;
  }

  const allowed = await callerMayNotify(callerId, userId, categoryIdentifier, bookingId);
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

    const successCount = await sendToExpoWithRetry(messages, 3);

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

// ── POST /api/push/batch ──────────────────────────────────────────────────
// Send push notifications to multiple users in a single request.
// Body: { userIds: string[], title, body, data?, categoryIdentifier?, channelId?, bookingId? }

router.post("/push/batch", async (req: Request, res: Response) => {
  const callerId = await verifyJwt(req.headers.authorization);
  if (!callerId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const { userIds, title, body, data, categoryIdentifier, channelId, bookingId } =
    (req.body ?? {}) as Record<string, unknown>;

  if (!Array.isArray(userIds) || !userIds.length ||
      typeof title !== "string" || !title ||
      typeof body !== "string" || !body) {
    res.status(400).json({ error: "userIds[], title, and body are required" });
    return;
  }

  const validIds = userIds.filter((id): id is string => typeof id === "string" && id.length > 0);
  if (!validIds.length) {
    res.json({ sent: 0, total: 0 });
    return;
  }

  // Authorize: for new_booking, verify the booking belongs to caller
  if (categoryIdentifier === "new_booking" && typeof bookingId === "string") {
    const bookingUrl =
      `${SUPABASE_URL}/rest/v1/bookings` +
      `?select=id,status` +
      `&id=eq.${encodeURIComponent(bookingId)}` +
      `&user_id=eq.${encodeURIComponent(callerId)}` +
      `&status=in.(pending,available)` +
      `&limit=1`;
    try {
      const bookingRes = await fetch(bookingUrl, {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          Accept: "application/json",
        },
      });
      if (!bookingRes.ok) {
        res.status(403).json({ error: "forbidden" });
        return;
      }
      const bookingRows: unknown = await bookingRes.json();
      if (!Array.isArray(bookingRows) || bookingRows.length === 0) {
        res.status(403).json({ error: "forbidden" });
        return;
      }
    } catch {
      res.status(403).json({ error: "forbidden" });
      return;
    }
  } else {
    const isAdmin = await callerIsAdmin(callerId);
    if (!isAdmin) {
      res.status(403).json({ error: "forbidden — batch requires admin or new_booking proof" });
      return;
    }
  }

  try {
    // Fetch tokens for all users in one query
    const idsParam = validIds.map(encodeURIComponent).join(",");
    const url = `${SUPABASE_URL}/rest/v1/push_tokens?select=token,user_id&user_id=in.(${idsParam})`;
    const tokRes = await fetch(url, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        Accept: "application/json",
      },
    });
    if (!tokRes.ok) {
      logger.error({ status: tokRes.status }, "push/batch: token fetch failed");
      res.status(500).json({ error: "token fetch failed" });
      return;
    }
    const rows: unknown = await tokRes.json();
    const tokens = Array.isArray(rows)
      ? rows.filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null)
            .map((r) => r.token)
            .filter((t): t is string => typeof t === "string" && t.length > 0)
      : [];

    if (!tokens.length) {
      res.json({ sent: 0, total: 0, message: "no tokens" });
      return;
    }

    const resolvedChannel =
      typeof channelId === "string" && channelId
        ? channelId
        : categoryIdentifier === "new_booking"
        ? "new_booking"
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

    const successCount = await sendToExpoWithRetry(messages, 3);

    logger.info(
      { callerId, userCount: validIds.length, sent: successCount, total: tokens.length },
      "push/batch: delivered",
    );
    res.json({ sent: successCount, total: tokens.length });
  } catch (e) {
    logger.error({ err: e }, "push/batch: send failed");
    res.status(500).json({ error: "push send failed" });
  }
});

export default router;
