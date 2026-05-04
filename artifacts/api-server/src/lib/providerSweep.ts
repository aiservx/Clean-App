import { logger } from "./logger";

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? "https://mffdpjwtwseftaqrslgx.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const STALE_MINUTES = 8;
const SWEEP_INTERVAL_MS = 2 * 60 * 1000;
const RENOTIFY_HOURS = 20; // don't re-notify same provider within 20 hours

// In-memory set: track which providers got a "come back" notification this session
const notifiedProviders = new Map<string, number>(); // providerId → timestamp

async function sweepStaleProviders(): Promise<void> {
  if (!SUPABASE_SERVICE_KEY) return;

  const cutoff = new Date(Date.now() - STALE_MINUTES * 60 * 1000).toISOString();

  try {
    const findUrl =
      `${SUPABASE_URL}/rest/v1/providers` +
      `?select=id` +
      `&available=eq.true` +
      `&location_updated_at=lt.${encodeURIComponent(cutoff)}`;

    const findRes = await fetch(findUrl, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        Accept: "application/json",
      },
    });

    if (!findRes.ok) {
      const errText = await findRes.text().catch(() => "");
      if (errText.includes("location_updated_at") || errText.includes("column")) {
        logger.warn(
          "providerSweep: column 'location_updated_at' missing — " +
          "run the migration: ALTER TABLE providers ADD COLUMN IF NOT EXISTS " +
          "location_updated_at TIMESTAMPTZ DEFAULT now();"
        );
      } else {
        logger.warn({ status: findRes.status, body: errText }, "providerSweep: query failed");
      }
      return;
    }

    const stale: unknown = await findRes.json();
    if (!Array.isArray(stale) || stale.length === 0) return;

    const ids = stale
      .filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null)
      .map((r) => r.id)
      .filter((id): id is string => typeof id === "string");

    if (!ids.length) return;

    const patchUrl =
      `${SUPABASE_URL}/rest/v1/providers` +
      `?id=in.(${ids.map(encodeURIComponent).join(",")})`;

    const patchRes = await fetch(patchUrl, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ available: false, current_lat: null, current_lng: null }),
    });

    if (patchRes.ok) {
      logger.info({ count: ids.length, cutoff }, "providerSweep: marked stale providers offline");
    } else {
      logger.warn({ status: patchRes.status }, "providerSweep: patch failed");
    }
  } catch (e) {
    logger.warn({ err: e }, "providerSweep: unexpected error");
  }
}

/** Send FCM push via Expo push service to a list of tokens */
async function sendExpoNotifications(
  tokens: string[],
  title: string,
  body: string,
): Promise<void> {
  if (!tokens.length) return;
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(
        tokens.map((to) => ({ to, title, body, sound: "default", data: { type: "re_online_reminder" } })),
      ),
    });
  } catch (e) {
    logger.warn({ err: e }, "providerSweep: push notification send failed");
  }
}

/**
 * Finds providers who have been offline for 12+ hours and sends them a
 * "come back online" push notification. Uses in-memory dedup to avoid spam.
 */
async function remindOfflineProviders(): Promise<void> {
  if (!SUPABASE_SERVICE_KEY) return;

  const OFFLINE_HOURS = 12;
  const cutoff = new Date(Date.now() - OFFLINE_HOURS * 60 * 60 * 1000).toISOString();
  const renotifyMs = RENOTIFY_HOURS * 60 * 60 * 1000;

  try {
    // Providers who are offline and haven't sent a heartbeat in 12+ hours
    const url =
      `${SUPABASE_URL}/rest/v1/providers` +
      `?select=id,push_token` +
      `&available=eq.false` +
      `&location_updated_at=lt.${encodeURIComponent(cutoff)}` +
      `&push_token=not.is.null`;

    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) return;
    const rows: unknown = await res.json();
    if (!Array.isArray(rows) || !rows.length) return;

    const now = Date.now();
    const tokensToNotify: string[] = [];

    for (const row of rows) {
      if (typeof row !== "object" || row === null) continue;
      const r = row as Record<string, unknown>;
      const id = typeof r.id === "string" ? r.id : null;
      const token = typeof r.push_token === "string" ? r.push_token : null;
      if (!id || !token) continue;

      // Skip if notified recently (in-memory dedup)
      const last = notifiedProviders.get(id) ?? 0;
      if (now - last < renotifyMs) continue;

      tokensToNotify.push(token);
      notifiedProviders.set(id, now);
    }

    if (!tokensToNotify.length) return;

    await sendExpoNotifications(
      tokensToNotify,
      "نظافة — نفتقدك! 🌟",
      "فعّل إتاحتك الآن وابدأ في استقبال طلبات جديدة.",
    );

    logger.info(
      { count: tokensToNotify.length },
      "providerSweep: sent re-online reminders to offline providers",
    );
  } catch (e) {
    logger.warn({ err: e }, "providerSweep: remindOfflineProviders error");
  }
}

export function startProviderSweep(): void {
  if (!SUPABASE_SERVICE_KEY) {
    logger.warn("providerSweep: SUPABASE_SERVICE_ROLE_KEY not set — sweep disabled");
    return;
  }

  logger.info(
    { intervalMs: SWEEP_INTERVAL_MS, staleMins: STALE_MINUTES },
    "providerSweep: started — providers with no heartbeat for 8+ min will be auto-offlined",
  );

  // Stale-sweep: every 2 min
  setTimeout(() => {
    sweepStaleProviders();
    setInterval(sweepStaleProviders, SWEEP_INTERVAL_MS);
  }, 15_000);

  // Re-online reminder: first run after 30 s, then every hour
  setTimeout(() => {
    remindOfflineProviders();
    setInterval(remindOfflineProviders, 60 * 60 * 1000);
  }, 30_000);
}
