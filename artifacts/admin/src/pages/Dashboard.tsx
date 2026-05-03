import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { Card, PageHeader, StatusChip } from "@/components/Layout";
import { supabase } from "@/lib/supabase";

export default function Dashboard() {
  const [stats, setStats] = useState<any>({});
  const [recent, setRecent] = useState<any[]>([]);
  const [liveCount, setLiveCount] = useState(0);

  const loadAll = useCallback(async () => {
    const [c, p, b, s, o, activeProviders] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "user"),
      supabase.from("providers").select("id", { count: "exact", head: true }),
      supabase.from("bookings").select("id, total, status", { count: "exact" }),
      supabase.from("services").select("id", { count: "exact", head: true }),
      supabase.from("offers").select("id", { count: "exact", head: true }).eq("active", true),
      supabase.from("providers").select("id", { count: "exact", head: true }).eq("available", true),
    ]);

    const totalRev = (b.data ?? [])
      .filter((x: any) => x.status === "completed")
      .reduce((s: number, x: any) => s + Number(x.total ?? 0), 0);
    const pendingCount = (b.data ?? []).filter((x: any) => x.status === "pending").length;

    setLiveCount(activeProviders.count ?? 0);
    setStats({
      users: c.count ?? 0,
      providers: p.count ?? 0,
      bookings: b.count ?? 0,
      services: s.count ?? 0,
      offers: o.count ?? 0,
      revenue: totalRev,
      pending: pendingCount,
      activeProviders: activeProviders.count ?? 0,
    });

    const { data } = await supabase
      .from("bookings")
      .select("id, status, total, scheduled_at, created_at, profiles!bookings_user_id_fkey(full_name), services(title_ar)")
      .order("created_at", { ascending: false })
      .limit(10);
    setRecent(data ?? []);
  }, []);

  useEffect(() => {
    loadAll();

    // ── Realtime: refresh dashboard on any booking change ──
    const ch = supabase
      .channel("admin-dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        loadAll();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "providers" }, () => {
        // Refresh active provider count when availability changes
        supabase
          .from("providers")
          .select("id", { count: "exact", head: true })
          .eq("available", true)
          .then(({ count }) => setLiveCount(count ?? 0));
      })
      .subscribe((s) => console.log("[admin-dashboard] realtime:", s));

    return () => { supabase.removeChannel(ch); };
  }, [loadAll]);

  const statCards = [
    { label: "العملاء", value: stats.users, icon: "👥", color: "#3B82F6", bg: "#EFF6FF" },
    { label: "مقدمو الخدمة", value: stats.providers, icon: "👷", color: "#8B5CF6", bg: "#F5F3FF" },
    { label: "الحجوزات", value: stats.bookings, icon: "📅", color: "#16C47F", bg: "#DCFCE7" },
    { label: "الخدمات", value: stats.services, icon: "🧹", color: "#F59E0B", bg: "#FEF3C7" },
    { label: "بانتظار التعيين", value: stats.pending, icon: "⏳", color: "#EF4444", bg: "#FEE2E2" },
    { label: "الإيرادات المكتملة (ر.س)", value: stats.revenue?.toLocaleString?.("ar-SA") ?? 0, icon: "💰", color: "#16C47F", bg: "#DCFCE7" },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bold" style={{ fontSize: 22, color: "#0F172A", fontFamily: "Tajawal, sans-serif" }}>
            لوحة التحكم
          </h1>
          <p style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>نظرة عامة على نشاط التطبيق</p>
        </div>
        {/* Live providers badge */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
          style={{ background: "#DCFCE7", color: "#16C47F" }}>
          <span className="live-dot" />
          <span style={{ fontWeight: 700, fontSize: 13, fontFamily: "Tajawal, sans-serif" }}>
            {liveCount} مزود متاح الآن
          </span>
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {statCards.map((c) => (
          <Card key={c.label} className="p-5">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl mb-3"
              style={{ background: c.bg, color: c.color }}>
              {c.icon}
            </div>
            <div className="font-bold" style={{ fontSize: 22, color: "#0F172A" }}>{c.value ?? "—"}</div>
            <div style={{ fontSize: 11, color: "#64748B", marginTop: 4, fontFamily: "Tajawal, sans-serif" }}>{c.label}</div>
          </Card>
        ))}
      </div>

      {/* ── Recent bookings ── */}
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between p-5 pb-4" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <div className="flex items-center gap-2">
            <span className="live-dot" />
            <h2 className="font-bold" style={{ fontFamily: "Tajawal, sans-serif", fontSize: 15 }}>
              آخر الحجوزات
            </h2>
          </div>
          <Link href="/bookings">
            <a className="text-sm font-bold transition-opacity hover:opacity-70"
              style={{ color: "var(--color-primary)", fontFamily: "Tajawal, sans-serif" }}>
              عرض الكل ←
            </a>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                {["رقم الطلب", "العميل", "الخدمة", "الموعد", "المبلغ", "الحالة"].map((h) => (
                  <th key={h} className="py-3 px-4 font-bold" style={{ color: "#94A3B8", fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}
                  className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4" style={{ fontFamily: "monospace", fontSize: 11, color: "#64748B" }}>
                    #{r.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="py-3 px-4 font-medium">{(r.profiles as any)?.full_name ?? "—"}</td>
                  <td className="py-3 px-4" style={{ color: "#64748B" }}>{(r.services as any)?.title_ar ?? "—"}</td>
                  <td className="py-3 px-4" style={{ color: "#64748B" }}>
                    {r.scheduled_at ? new Date(r.scheduled_at).toLocaleString("ar-SA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "موعد مرن"}
                  </td>
                  <td className="py-3 px-4 font-bold" style={{ color: "var(--color-primary)" }}>
                    {Number(r.total ?? 0).toLocaleString("ar-SA")} ر.س
                  </td>
                  <td className="py-3 px-4">
                    <StatusChip status={r.status} />
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center" style={{ color: "#94A3B8" }}>لا توجد حجوزات بعد</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
