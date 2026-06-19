/**
 * Dynamic Pricing API
 * GET /api/pricing/multiplier?service_id=X — returns current price multiplier
 * GET /api/pricing/config — returns full pricing grid (for mobile app)
 */
import { Router } from "express";
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY } from "../lib/supabase.js";

const router = Router();

async function getPricingConfig(): Promise<any> {
  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/app_settings?key=eq.dynamic_pricing&select=value&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" } }
  );
  if (!res.ok) return null;
  const rows = await res.json() as any[];
  return rows[0]?.value ?? null;
}

/**
 * GET /api/pricing/config
 * Returns the full dynamic pricing configuration for the mobile app.
 * Public endpoint (no auth required).
 */
router.get("/api/pricing/config", async (_req, res) => {
  try {
    const config = await getPricingConfig();
    if (!config?.enabled) {
      return res.json({ enabled: false, multiplier: 1, grid: null });
    }
    res.json(config);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/pricing/multiplier
 * Returns the price multiplier for the current moment.
 * Used by mobile app to show adjusted price before booking.
 */
router.get("/api/pricing/multiplier", async (_req, res) => {
  try {
    const config = await getPricingConfig();
    if (!config?.enabled || !config?.grid) {
      return res.json({ multiplier: 1, enabled: false });
    }

    const now = new Date();
    const day = now.getDay();   // 0=Sunday … 6=Saturday
    const hour = now.getHours();

    const multiplier = config.grid?.[day]?.[hour] ?? 1;
    const label = multiplier >= 1.75 ? "ذروة عالية"
      : multiplier >= 1.5 ? "ذروة"
      : multiplier >= 1.25 ? "ارتفاع خفيف"
      : "عادي";

    res.json({
      multiplier,
      enabled: true,
      day,
      hour,
      label,
      tip: multiplier > 1 ? `الأسعار مرتفعة الآن (${multiplier}×). للحصول على سعر أفضل، احجز في ساعات أخرى.` : null,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/pricing/dynamic
 * Alias used by mobile app — returns per-service pricing array with multipliers.
 */
router.get("/api/pricing/dynamic", async (_req, res) => {
  try {
    const config = await getPricingConfig();
    if (!config?.enabled || !config?.grid) {
      return res.json({ data: [], multiplier: 1, enabled: false });
    }
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const multiplier = config.grid?.[day]?.[hour] ?? 1;
    // Return array format expected by mobile app
    res.json({ data: [{ multiplier }], multiplier, enabled: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
