import { useEffect, useState, useCallback } from "react";
import { Card, PageHeader } from "@/components/Layout";
import { supabase } from "@/lib/supabase";

const STAR_COLOR = "#F59E0B";
const PRIMARY    = "#16C47F";
const DANGER     = "#EF4444";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  booking_id: string | null;
  user_id: string | null;
  provider_id: string | null;
  flagged?: boolean;
  user_profile?: { full_name?: string | null } | null;
  provider_profile?: { full_name?: string | null } | null;
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} style={{ color: s <= rating ? STAR_COLOR : "#CBD5E1", fontSize: 14 }}>★</span>
      ))}
    </span>
  );
}

function RatingBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm" style={{ fontFamily: "Tajawal, sans-serif" }}>
      <span className="w-16 text-right text-gray-500">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="w-8 text-gray-400 text-xs">{count}</span>
    </div>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("reviews")
      .select(`
        id, rating, comment, created_at, booking_id, user_id, provider_id,
        user_profile:user_id ( full_name ),
        provider_profile:provider_id ( full_name )
      `)
      .order("created_at", { ascending: false })
      .limit(300);
    setReviews((data as any[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا التقييم؟")) return;
    setDeleting(id);
    await supabase.from("reviews").delete().eq("id", id);
    setReviews((prev) => prev.filter((r) => r.id !== id));
    setDeleting(null);
  };

  const filtered = reviews.filter((r) => {
    if (filterRating !== null && r.rating !== filterRating) return false;
    if (search) {
      const q = search.toLowerCase();
      const provName = ((r.provider_profile as any)?.full_name ?? "").toLowerCase();
      const userName = ((r.user_profile as any)?.full_name ?? "").toLowerCase();
      const comment = (r.comment ?? "").toLowerCase();
      if (!provName.includes(q) && !userName.includes(q) && !comment.includes(q)) return false;
    }
    return true;
  });

  // Stats
  const total = reviews.length;
  const avg = total ? (reviews.reduce((s, r) => s + r.rating, 0) / total) : 0;
  const dist = [5, 4, 3, 2, 1].map((s) => ({
    star: s,
    count: reviews.filter((r) => r.rating === s).length,
    color: s >= 4 ? PRIMARY : s === 3 ? "#F59E0B" : DANGER,
    label: `${s} نجوم`,
  }));
  const fiveStarPct = total ? Math.round((reviews.filter((r) => r.rating === 5).length / total) * 100) : 0;
  const lowRated = reviews.filter((r) => r.rating <= 2).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="إدارة التقييمات"
        subtitle="مراجعة وإدارة جميع تقييمات العملاء"
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: "⭐", label: "إجمالي التقييمات", value: total.toLocaleString("ar-SA"), color: STAR_COLOR, bg: "#FEF3C7" },
          { icon: "📊", label: "متوسط التقييم", value: avg.toFixed(1) + " / 5", color: PRIMARY, bg: "#DCFCE7" },
          { icon: "🌟", label: "تقييمات 5 نجوم", value: fiveStarPct + "%", color: "#3B82F6", bg: "#DBEAFE" },
          { icon: "⚠️", label: "تقييمات منخفضة (1-2)", value: lowRated.toLocaleString("ar-SA"), color: DANGER, bg: "#FEE2E2" },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: s.bg }}>
                {s.icon}
              </div>
              <div>
                <div className="text-xs text-gray-500" style={{ fontFamily: "Tajawal, sans-serif" }}>{s.label}</div>
                <div className="font-bold text-lg" style={{ color: s.color, fontFamily: "Tajawal, sans-serif" }}>{s.value}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Rating distribution */}
        <Card className="p-5">
          <div className="font-bold mb-4 text-gray-800 text-sm" style={{ fontFamily: "Tajawal, sans-serif" }}>
            توزيع التقييمات
          </div>
          {/* Big avg display */}
          <div className="flex flex-col items-center mb-5">
            <div className="text-5xl font-black" style={{ color: "#0F172A", fontFamily: "Tajawal, sans-serif" }}>
              {avg.toFixed(1)}
            </div>
            <Stars rating={Math.round(avg)} />
            <div className="text-xs text-gray-400 mt-1" style={{ fontFamily: "Tajawal, sans-serif" }}>
              بناءً على {total.toLocaleString("ar-SA")} تقييم
            </div>
          </div>
          <div className="space-y-2">
            {dist.map((d) => (
              <RatingBar key={d.star} label={d.label} count={d.count} total={total} color={d.color} />
            ))}
          </div>
        </Card>

        {/* Filters + list */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search + filter */}
          <Card className="p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث باسم المزود أو العميل أو التعليق…"
                className="flex-1 min-w-[200px] border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-green-400"
                style={{ fontFamily: "Tajawal, sans-serif" }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterRating(null)}
                  className="px-3 py-1.5 rounded-lg text-sm transition-colors"
                  style={{
                    fontFamily: "Tajawal, sans-serif",
                    background: filterRating === null ? PRIMARY : "#F1F5F9",
                    color: filterRating === null ? "white" : "#64748B",
                  }}
                >
                  الكل
                </button>
                {[5, 4, 3, 2, 1].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterRating(filterRating === s ? null : s)}
                    className="px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1"
                    style={{
                      fontFamily: "Tajawal, sans-serif",
                      background: filterRating === s ? STAR_COLOR : "#F1F5F9",
                      color: filterRating === s ? "white" : "#64748B",
                    }}
                  >
                    {s} ★
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Reviews list */}
          <Card className="p-0 overflow-hidden">
            {loading ? (
              <div className="text-center py-10 text-gray-400" style={{ fontFamily: "Tajawal, sans-serif" }}>
                جاري التحميل…
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 text-gray-400" style={{ fontFamily: "Tajawal, sans-serif" }}>
                لا توجد تقييمات تطابق البحث
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[520px] overflow-y-auto">
                {filtered.map((r) => {
                  const provName = (r.provider_profile as any)?.full_name ?? "مزود غير معروف";
                  const userName = (r.user_profile as any)?.full_name ?? "عميل غير معروف";
                  const isLow = r.rating <= 2;
                  return (
                    <div
                      key={r.id}
                      className="p-4 hover:bg-gray-50 transition-colors"
                      style={{ borderRight: isLow ? `3px solid ${DANGER}` : "3px solid transparent" }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Stars rating={r.rating} />
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{
                                background: r.rating >= 4 ? "#DCFCE7" : r.rating === 3 ? "#FEF3C7" : "#FEE2E2",
                                color: r.rating >= 4 ? PRIMARY : r.rating === 3 ? "#92400E" : DANGER,
                                fontFamily: "Tajawal, sans-serif",
                              }}
                            >
                              {r.rating === 5 ? "ممتاز" : r.rating === 4 ? "جيد جداً" : r.rating === 3 ? "متوسط" : r.rating === 2 ? "سيء" : "سيء جداً"}
                            </span>
                            {isLow && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#FEE2E2", color: DANGER, fontFamily: "Tajawal, sans-serif" }}>
                                ⚠️ يحتاج مراجعة
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-semibold text-gray-800 mb-0.5" style={{ fontFamily: "Tajawal, sans-serif" }}>
                            👷 {provName} &nbsp;·&nbsp; 👤 {userName}
                          </div>
                          {r.comment && (
                            <div
                              className="text-sm text-gray-600 mt-1 leading-relaxed line-clamp-3"
                              style={{ fontFamily: "Tajawal, sans-serif" }}
                            >
                              "{r.comment}"
                            </div>
                          )}
                          <div className="text-xs text-gray-400 mt-1.5" style={{ fontFamily: "Tajawal, sans-serif" }}>
                            {new Date(r.created_at).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleDelete(r.id)}
                            disabled={deleting === r.id}
                            className="text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-red-50"
                            style={{
                              fontFamily: "Tajawal, sans-serif",
                              borderColor: "#FCA5A5",
                              color: DANGER,
                              opacity: deleting === r.id ? 0.5 : 1,
                            }}
                          >
                            {deleting === r.id ? "جاري…" : "🗑️ حذف"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
