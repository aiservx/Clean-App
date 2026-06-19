/**
 * Analytics API — aggregated stats for the admin dashboard.
 * All routes require a valid admin JWT.
 */
import { Router } from "express";
import { verifyJwt, isAdminUser, sbFetch, SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY } from "../lib/supabase.js";

const router = Router();

// ── Middleware: admin only ─────────────────────────────────────────────────
async function requireAdmin(req: any, res: any, next: any) {
  const userId = await verifyJwt(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const admin = await isAdminUser(userId);
  if (!admin) return res.status(403).json({ error: "Forbidden — admin only" });
  next();
}

// ── Helper: Supabase REST query ───────────────────────────────────────────
async function sbQuery(path: string) {
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

// ── GET /api/analytics/summary ─────────────────────────────────────────────
router.get("/api/analytics/summary", requireAdmin, async (_req, res) => {
  try {
    const [bookings, users, providers, reviews] = await Promise.all([
      sbQuery("bookings?select=id,status,total,created_at"),
      sbQuery("profiles?select=id,created_at&role=eq.user"),
      sbQuery("providers?select=id,available,rating"),
      sbQuery("reviews?select=rating"),
    ]);

    const completed = (bookings as any[]).filter((b: any) => b.status === "completed");
    const totalRevenue = completed.reduce((s: number, b: any) => s + Number(b.total ?? 0), 0);
    const avgBookingValue = completed.length > 0 ? totalRevenue / completed.length : 0;
    const cancellationRate = (bookings as any[]).length > 0
      ? (bookings as any[]).filter((b: any) => b.status === "cancelled").length / (bookings as any[]).length
      : 0;
    const avgRating = (reviews as any[]).length > 0
      ? (reviews as any[]).reduce((s: number, r: any) => s + r.rating, 0) / (reviews as any[]).length
      : 0;

    res.json({
      totalRevenue,
      totalBookings: (bookings as any[]).length,
      completedBookings: completed.length,
      cancelledBookings: (bookings as any[]).filter((b: any) => b.status === "cancelled").length,
      pendingBookings: (bookings as any[]).filter((b: any) => b.status === "pending").length,
      avgBookingValue: Math.round(avgBookingValue),
      cancellationRate: Math.round(cancellationRate * 100),
      totalUsers: (users as any[]).length,
      totalProviders: (providers as any[]).length,
      activeProviders: (providers as any[]).filter((p: any) => p.available).length,
      avgRating: Number(avgRating.toFixed(2)),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/analytics/revenue?days=30 ────────────────────────────────────
router.get("/api/analytics/revenue", requireAdmin, async (req, res) => {
  try {
    const days = Math.min(Number(req.query.days ?? 30), 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const bookings = await sbQuery(
      `bookings?select=status,total,created_at&created_at=gte.${encodeURIComponent(since)}`
    ) as any[];

    // Build day map
    const dayMap: Record<string, { date: string; revenue: number; bookings: number; cancelled: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      dayMap[key] = { date: key, revenue: 0, bookings: 0, cancelled: 0 };
    }
    for (const b of bookings) {
      const key = new Date(b.created_at).toISOString().slice(0, 10);
      if (!dayMap[key]) continue;
      dayMap[key].bookings += 1;
      if (b.status === "completed") dayMap[key].revenue += Number(b.total ?? 0);
      if (b.status === "cancelled") dayMap[key].cancelled += 1;
    }

    res.json(Object.values(dayMap));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/analytics/providers/top?limit=10 ─────────────────────────────
router.get("/api/analytics/providers/top", requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 10), 50);

    const [bookings, providers] = await Promise.all([
      sbQuery("bookings?select=provider_id,status,total&status=eq.completed"),
      sbQuery(`providers?select=id,rating,available,profiles(full_name,phone,avatar_url)&limit=${limit}`),
    ]);

    const revMap: Record<string, number> = {};
    const countMap: Record<string, number> = {};
    for (const b of bookings as any[]) {
      if (!b.provider_id) continue;
      revMap[b.provider_id] = (revMap[b.provider_id] ?? 0) + Number(b.total ?? 0);
      countMap[b.provider_id] = (countMap[b.provider_id] ?? 0) + 1;
    }

    const ranked = (providers as any[]).map((p: any) => ({
      id: p.id,
      name: (p.profiles as any)?.full_name ?? "—",
      phone: (p.profiles as any)?.phone ?? "",
      avatar: (p.profiles as any)?.avatar_url ?? null,
      rating: Number(p.rating ?? 0),
      available: Boolean(p.available),
      completedBookings: countMap[p.id] ?? 0,
      revenue: revMap[p.id] ?? 0,
      score: (countMap[p.id] ?? 0) * 0.6 + Number(p.rating ?? 0) * 0.4,
    })).sort((a, b) => b.score - a.score).slice(0, limit);

    res.json(ranked);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/analytics/services/top ───────────────────────────────────────
router.get("/api/analytics/services/top", requireAdmin, async (_req, res) => {
  try {
    const bookings = await sbQuery(
      "bookings?select=service_id,status,total,services(title_ar)"
    ) as any[];

    const svcMap: Record<string, { name: string; bookings: number; revenue: number }> = {};
    for (const b of bookings) {
      const name = (b.services as any)?.title_ar ?? b.service_id ?? "غير محدد";
      if (!svcMap[name]) svcMap[name] = { name, bookings: 0, revenue: 0 };
      svcMap[name].bookings += 1;
      if (b.status === "completed") svcMap[name].revenue += Number(b.total ?? 0);
    }

    res.json(Object.values(svcMap).sort((a, b) => b.bookings - a.bookings).slice(0, 10));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/analytics/hourly ──────────────────────────────────────────────
router.get("/api/analytics/hourly", requireAdmin, async (_req, res) => {
  try {
    const bookings = await sbQuery("bookings?select=created_at") as any[];
    const hourMap: Record<number, number> = {};
    for (let h = 0; h < 24; h++) hourMap[h] = 0;
    for (const b of bookings) hourMap[new Date(b.created_at).getHours()] += 1;
    const result = Object.entries(hourMap).map(([hour, count]) => ({
      hour: Number(hour),
      label: `${hour}:00`,
      count,
      isPeak: count > (bookings.length / 24) * 1.5,
    }));
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
