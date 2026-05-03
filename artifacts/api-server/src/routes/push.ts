import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? "https://ppokdtzlisaxsrmtwlrb.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  "";

async function fetchPushTokens(userId: string): Promise<string[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    logger.warn("push: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — cannot fetch tokens");
    return [];
  }
  const url = `${SUPABASE_URL}/rest/v1/push_tokens?select=token&user_id=eq.${encodeURIComponent(userId)}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    logger.error({ status: res.status, userId }, "push: supabase token fetch failed");
    return [];
  }
  const rows: { token: string }[] = await res.json().catch(() => []);
  return rows.map((r) => r.token).filter(Boolean);
}

router.post("/push", async (req, res) => {
  const { userId, title, body, data, categoryIdentifier, channelId } =
    req.body ?? {};

  if (!userId || !title || !body) {
    res.status(400).json({ error: "userId, title, and body are required" });
    return;
  }

  try {
    const tokens = await fetchPushTokens(userId as string);

    if (!tokens.length) {
      logger.info({ userId }, "push: no tokens found for user");
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

    const successCount = (pushJson?.data ?? []).filter(
      (d) => d?.status === "ok",
    ).length;

    logger.info(
      { userId, sent: successCount, total: tokens.length },
      "push: delivered",
    );
    res.json({ sent: successCount, total: tokens.length });
  } catch (e) {
    logger.error({ err: e }, "push: send failed");
    res.status(500).json({ error: "push send failed" });
  }
});

export default router;
