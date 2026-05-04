import { logger } from "./logger";

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? "https://mffdpjwtwseftaqrslgx.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const STALE_MINUTES = 8;
const SWEEP_INTERVAL_MS = 2 * 60 * 1000;

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

export function startProviderSweep(): void {
  if (!SUPABASE_SERVICE_KEY) {
    logger.warn("providerSweep: SUPABASE_SERVICE_ROLE_KEY not set — sweep disabled");
    return;
  }

  logger.info(
    { intervalMs: SWEEP_INTERVAL_MS, staleMins: STALE_MINUTES },
    "providerSweep: started — providers with no heartbeat for 8+ min will be auto-offlined",
  );

  setTimeout(() => {
    sweepStaleProviders();
    setInterval(sweepStaleProviders, SWEEP_INTERVAL_MS);
  }, 15_000);
}
