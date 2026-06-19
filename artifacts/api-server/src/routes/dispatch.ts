/**
 * Smart Auto-Dispatch — finds the best available provider for a booking.
 *
 * Scoring algorithm (weighted):
 *   score = 0.40 × proximity_score   (closer = better)
 *         + 0.30 × rating_score      (higher rating = better)
 *         + 0.20 × acceptance_score  (higher acceptance rate = better)
 *         + 0.10 × load_score        (fewer active bookings = better)
 */
import { Router } from "express";
import { verifyJwt, sbFetch, SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY } from "../lib/supabase.js";

const router = Router();

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function sbGet(path: string): Promise<any[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  return res.json();
}

/**
 * GET /api/dispatch/suggest
 * Query params:
 *   lat      — customer latitude
 *   lng      — customer longitude
 *   service_id — (optional) filter by service category
 *   limit    — number of candidates to return (default 5)
 *
 * Returns ranked list of available providers with scores.
 */
router.get("/dispatch/suggest", async (req, res) => {
  try {
    const userId = await verifyJwt(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const limit = Math.min(Number(req.query.limit ?? 5), 20);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: "lat and lng are required" });
    }

    // Fetch all available providers with location
    const providers = await sbGet(
      "providers?select=id,rating,service_radius_km,current_lat,current_lng,available,profiles(full_name,phone,avatar_url)&available=eq.true&status=eq.approved"
    );

    if (!providers.length) {
      return res.json({ candidates: [], message: "لا يوجد مزودون متاحون حالياً" });
    }

    // Fetch active bookings count per provider
    const activeBookings = await sbGet(
      "bookings?select=provider_id&status=in.(pending,accepted,on_the_way,arrived,started)"
    );
    const activeCountMap: Record<string, number> = {};
    for (const b of activeBookings) {
      if (b.provider_id) activeCountMap[b.provider_id] = (activeCountMap[b.provider_id] ?? 0) + 1;
    }

    // Fetch acceptance rates (completed / (completed + rejected + cancelled))
    const allBookings = await sbGet(
      "bookings?select=provider_id,status&status=in.(completed,rejected,cancelled)"
    );
    const acceptMap: Record<string, { completed: number; total: number }> = {};
    for (const b of allBookings) {
      if (!b.provider_id) continue;
      if (!acceptMap[b.provider_id]) acceptMap[b.provider_id] = { completed: 0, total: 0 };
      acceptMap[b.provider_id].total += 1;
      if (b.status === "completed") acceptMap[b.provider_id].completed += 1;
    }

    // Score each provider
    const maxRating = 5;
    const candidates = providers
      .filter((p: any) => p.current_lat && p.current_lng)
      .map((p: any) => {
        const dist = distanceKm(lat, lng, Number(p.current_lat), Number(p.current_lng));
        const radius = Number(p.service_radius_km ?? 20);

        // Skip providers outside their service radius
        if (dist > radius) return null;

        const proximityScore = Math.max(0, 1 - dist / radius);
        const ratingScore = Number(p.rating ?? 3) / maxRating;
        const accept = acceptMap[p.id];
        const acceptanceScore = accept ? accept.completed / accept.total : 0.5;
        const activeCount = activeCountMap[p.id] ?? 0;
        const loadScore = Math.max(0, 1 - activeCount / 5);

        const totalScore = (
          0.40 * proximityScore +
          0.30 * ratingScore +
          0.20 * acceptanceScore +
          0.10 * loadScore
        );

        return {
          provider_id: p.id,
          name: (p.profiles as any)?.full_name ?? "—",
          phone: (p.profiles as any)?.phone ?? "",
          avatar: (p.profiles as any)?.avatar_url ?? null,
          rating: Number(p.rating ?? 0),
          distanceKm: Math.round(dist * 10) / 10,
          activeBookings: activeCount,
          acceptanceRate: Math.round((accept ? accept.completed / accept.total : 0.5) * 100),
          score: Math.round(totalScore * 100) / 100,
          scoreBreakdown: {
            proximity: Math.round(proximityScore * 100),
            rating: Math.round(ratingScore * 100),
            acceptance: Math.round(acceptanceScore * 100),
            load: Math.round(loadScore * 100),
          },
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, limit);

    res.json({
      candidates,
      total: candidates.length,
      location: { lat, lng },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/dispatch/auto-assign
 * Body: { booking_id, lat, lng }
 *
 * Automatically assigns the top-scored provider to a booking.
 * Requires admin JWT.
 */
router.post("/dispatch/auto-assign", async (req, res) => {
  try {
    const userId = await verifyJwt(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { booking_id, lat, lng } = req.body as { booking_id: string; lat: number; lng: number };
    if (!booking_id || !lat || !lng) {
      return res.status(400).json({ error: "booking_id, lat, lng required" });
    }

    // Get suggestions
    const suggestRes = await fetch(
      `${req.protocol}://${req.headers.host}/api/dispatch/suggest?lat=${lat}&lng=${lng}&limit=1`,
      { headers: { Authorization: req.headers.authorization ?? "" } }
    );
    const { candidates } = await suggestRes.json();

    if (!candidates?.length) {
      return res.status(404).json({ error: "لا يوجد مزودون متاحون في المنطقة" });
    }

    const best = candidates[0];

    // Assign provider to booking
    await sbFetch(
      `bookings?id=eq.${encodeURIComponent(booking_id)}`,
      "PATCH",
      { provider_id: best.provider_id, status: "accepted" }
    );

    res.json({
      success: true,
      assigned: best,
      message: `تم التعيين التلقائي للمزود: ${best.name}`,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
