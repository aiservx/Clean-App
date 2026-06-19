import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { Card, PageHeader, StatusChip } from "@/components/Layout";
import { supabase } from "@/lib/supabase";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const PRIMARY = "#16C47F";
const WARNING = "#F59E0B";
const DANGER = "#EF4444";
const INFO = "#3B82F6";
const PURPLE = "#7C3AED";

// ── Spark Line (mini chart for KPI cards) ──────────────────────────────────
function SparkLine({ data, color }: { data: number[]; color: string }) {
  const pts = data.map((v, i) => ({ v, i }));
  return (
    <ResponsiveContainer width={80} height={36}>
      <AreaChart data={pts} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <defs>
          <linearGradient id={`sg-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#sg-${color.slice(1)})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, color, bg, spark, sub, link }: {
  label: string; value: string | number; icon: string;
  color: string; bg: string; spark?: number[]; sub?: string; link?: string;
}) {
  const inner = (
    <Card className="p-5 cursor-pointer hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: bg }}>
          {icon}
        </div>
        {spark && <SparkLine data={spark} color={color} />}
      </div>
      <div className="font-bold mt-2" style={{ fontSize: 24, color: "#0F172A", fontFamily: "Tajawal, sans-serif" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#64748B", marginTop: 2, fontFamily: "Tajawal, sans-serif" }}>{label}</div>
      {sub && <div className="font-medium mt-1" style={{ fontSize: 11, color }}>{sub}</div>}
    </Card>
  );
  return link ? <Link href={link}><a>{inner}</a></Link> : inner;
}

// ── Revenue sparkline from last 7 days ─────────────────────────────────────
function buildSparkData(bookings: any[], days = 7): number[] {
  const result: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    const dayTotal = bookings
      .filter((b: any) => b.status === "completed" && b.created_at?.slice(0, 10) === key)
      .reduce((s: number, b: any) => s + Number(b.total ?? 0), 0);
    result.push(dayTotal);
  }
  return result;
}

// ── Mini revenue chart (last 7 days for main dashboard) ────────────────────
function MiniRevenueChart({ bookings }: { bookings: any[] }) {
  const data = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    const label = `${d.getDate()}/${d.getMonth() + 1}`;
    const rev = bookings
      .filter((b: any) => b.status === "completed" && b.created_at?.slice(0, 10) === key)
      .reduce((s: number, b: any) => s + Number(b.total ?? 0), 0);
    const count = bookings.filter((b: any) => b.created_at?.slice(0, 10) === key).length;
    data.push({ label, rev, count });
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-900" style={{ fontFamily: "Tajawal, sans-serif" }}>إيرادات آخر 7 أيام</h3>
          <p className="text-xs text-gray-500 mt-0.5">الحجوزات المكتملة فقط</p>
        </div>
        <Link href="/analytics">
          <a className="text-xs font-bold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
            style={{ background: "var(--color-primary-light)", color: PRIMARY, fontFamily: "Tajawal, sans-serif" }}>
            تحليل كامل ←
          </a>
        </Link>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(v: number, name: string) => [
              name === "rev" ? `${v.toLocaleString("ar-SA")} ر.س` : `${v} حجز`,
              name === "rev" ? "الإيرادات" : "الحجوزات",
            ]}
            contentStyle={{ fontFamily: "Tajawal, sans-serif", fontSize: 12, borderRadius: 10, border: "1px solid #E2E8F0" }}
          />
          <Bar dataKey="rev" name="rev" fill={PRIMARY} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ── Quick Actions ───────────────────────────────────────────────────────────
function QuickActions() {
  const actions = [
    { label: "إضافة مزود", icon: "👷", href: "/providers", color: PURPLE, bg: "#F5F3FF" },
    { label: "إشعار جماعي", icon: "📣", href: "/notifications", color: INFO, bg: "#EFF6FF" },
    { label: "إضافة عرض", icon: "🎁", href: "/offers", color: WARNING, bg: "#FEF3C7" },
    { label: "تقارير مفصلة", icon: "📊", href: "/analytics", color: PRIMARY, bg: "#DCFCE7" },
  ];
  return (
    <Card className="p-5">
      <h3 className="font-bold text-gray-900 mb-3" style={{ fontFamily: "Tajawal, sans-serif", fontSize: 14 }}>إجراءات سريعة</h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((a) => (
          <Link key={a.href} href={a.href}>
            <a className="flex items-center gap-2 px-3 py-2.5 rounded-xl transition-opacity hover:opacity-80"
              style={{ background: a.bg }}>
              <span className="text-lg">{a.icon}</span>
              <span className="font-bold text-sm" style={{ color: a.color, fontFamily: "Tajawal, sans-serif" }}>{a.label}</span>
            </a>
          </Link>
        ))}
      </div>
    </Card>
  );
}

// ── Smart Alerts ────────────────────────────────────────────────────────────
function SmartAlerts({ bookings, pendingSupport }: { bookings: any[]; pendingSupport: number }) {
  const alerts: { type: "error" | "warn" | "info"; icon: string; msg: string; href?: string }[] = [];

  // Bookings pending > 30 min
  const staleTime = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const stale = bookings.filter((b: any) => b.status === "pending" && b.created_at < staleTime);
  if (stale.length > 0)
    alerts.push({ type: "error", icon: "⏰", msg: `${stale.length} ${stale.length === 1 ? "طلب" : "طلبات"} تنتظر التعيين أكثر من 30 دقيقة`, href: "/bookings" });

  // Support tickets
  if (pendingSupport >= 5)
    alerts.push({ type: "warn", icon: "🎧", msg: `${pendingSupport} تذكرة دعم مفتوحة تحتاج ردوداً`, href: "/support" });

  // High cancellation rate
  const cancelled = bookings.filter((b: any) => b.status === "cancelled").length;
  const cancelRate = bookings.length > 10 ? Math.round(cancelled / bookings.length * 100) : 0;
  if (cancelRate > 20)
    alerts.push({ type: "warn", icon: "📉", msg: `معدل الإلغاء مرتفع: ${cancelRate}% — راجع جودة المزودين`, href: "/providers" });

  // No bookings today
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayCount = bookings.filter((b: any) => b.created_at?.slice(0, 10) === todayKey).length;
  if (bookings.length > 50 && todayCount === 0)
    alerts.push({ type: "info", icon: "💡", msg: "لا توجد حجوزات اليوم — أرسل إشعاراً ترويجياً", href: "/notifications" });

  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mb-5">
      {alerts.map((a, i) => {
        const bg = a.type === "error" ? "#FEE2E2" : a.type === "warn" ? "#FEF3C7" : "#DBEAFE";
        const color = a.type === "error" ? "#DC2626" : a.type === "warn" ? "#D97706" : "#2563EB";
        const inner = (
          <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold cursor-pointer transition-opacity hover:opacity-80"
            style={{ background: bg, color, fontFamily: "Tajawal, sans-serif" }}>
            <span className="text-base">{a.icon}</span>
            <span className="flex-1">{a.msg}</span>
            {a.href && <span style={{ opacity: 0.6, fontSize: 12 }}>←</span>}
          </div>
        );
        return a.href ? <Link key={i} href={a.href}><a>{inner}</a></Link> : inner;
      })}
    </div>
  );
}

// ── Live Status Banner ──────────────────────────────────────────────────────
function LiveBanner({ pending, liveCount }: { pending: number; liveCount: number }) {
  if (!pending && !liveCount) return null;
  return (
    <div className="flex items-center gap-3 flex-wrap mb-6">
      {liveCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: "#DCFCE7" }}>
          <span className="live-dot" />
          <span style={{ color: PRIMARY, fontWeight: 700, fontSize: 13, fontFamily: "Tajawal, sans-serif" }}>
            {liveCount} مزود متاح الآن
          </span>
        </div>
      )}
      {pending > 0 && (
        <Link href="/bookings">
          <a className="flex items-center gap-2 px-4 py-2 rounded-xl transition-opacity hover:opacity-80" style={{ background: "#FEE2E2" }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: DANGER }} />
            <span style={{ color: DANGER, fontWeight: 700, fontSize: 13, fontFamily: "Tajawal, sans-serif" }}>
              {pending} حجز ينتظر التعيين
            </span>
          </a>
        </Link>
      )}
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const [stats, setStats] = useState<any>({});
  const [recent, setRecent] = useState<any[]>([]);
  const [liveCount, setLiveCount] = useState(0);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [pendingSupport, setPendingSupport] = useState(0);

  const loadAll = useCallback(async () => {
    const [c, p, b, s, o, activeProviders, tickets] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "user"),
      supabase.from("providers").select("id", { count: "exact", head: true }),
      supabase.from("bookings").select("id, total, status, created_at"),
      supabase.from("services").select("id", { count: "exact", head: true }),
      supabase.from("offers").select("id", { count: "exact", head: true }).eq("active", true),
      supabase.from("providers").select("id", { count: "exact", head: true }).eq("available", true),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
    ]);

    const bookingData = b.data ?? [];
    setAllBookings(bookingData);

    const totalRev = bookingData
      .filter((x: any) => x.status === "completed")
      .reduce((s: number, x: any) => s + Number(x.total ?? 0), 0);
    const pendingCount = bookingData.filter((x: any) => x.status === "pending").length;

    setLiveCount(activeProviders.count ?? 0);
    setPendingSupport(tickets.count ?? 0);
    setStats({
      users: c.count ?? 0,
      providers: p.count ?? 0,
      bookings: b.count ?? 0,
      services: s.count ?? 0,
      offers: o.count ?? 0,
      revenue: totalRev,
      pending: pendingCount,
      activeProviders: activeProviders.count ?? 0,
      completed: bookingData.filter((x: any) => x.status === "completed").length,
      cancelled: bookingData.filter((x: any) => x.status === "cancelled").length,
    });

    const { data } = await supabase
      .from("bookings")
      .select("id, status, total, scheduled_at, created_at, profiles!bookings_user_id_fkey(full_name), services(title_ar)")
      .order("created_at", { ascending: false })
      .limit(8);
    setRecent(data ?? []);
  }, []);

  useEffect(() => {
    loadAll();
    const ch = supabase
      .channel("admin-dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => loadAll())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "providers" }, () => {
        supabase.from("providers").select("id", { count: "exact", head: true }).eq("available", true)
          .then(({ count }) => setLiveCount(count ?? 0));
      })
      .subscribe(() => {});
    return () => { supabase.removeChannel(ch); };
  }, [loadAll]);

  const completionRate = stats.bookings ? Math.round(stats.completed / stats.bookings * 100) : 0;
  const revSpark = buildSparkData(allBookings);
  const bookingsSpark = buildSparkData(allBookings.map((b: any) => ({ ...b, status: "completed", total: 1 })));

  const statCards = [
    { label: "إجمالي العملاء", value: stats.users?.toLocaleString("ar-SA") ?? "—", icon: "👥", color: INFO, bg: "#EFF6FF", spark: undefined, link: "/customers" },
    { label: "مقدمو الخدمة", value: stats.providers?.toLocaleString("ar-SA") ?? "—", icon: "👷", color: PURPLE, bg: "#F5F3FF", spark: undefined, link: "/providers" },
    { label: "إجمالي الحجوزات", value: stats.bookings?.toLocaleString("ar-SA") ?? "—", icon: "📅", color: PRIMARY, bg: "#DCFCE7", spark: bookingsSpark, link: "/bookings" },
    { label: "الإيرادات (ر.س)", value: stats.revenue?.toLocaleString?.("ar-SA") ?? "0", icon: "💰", color: PRIMARY, bg: "#DCFCE7", spark: revSpark, link: "/analytics" },
    { label: "بانتظار التعيين", value: stats.pending ?? "—", icon: "⏳", color: DANGER, bg: "#FEE2E2", spark: undefined, link: "/bookings", sub: "اضغط للمعالجة" },
    { label: "معدل الإتمام", value: `${completionRate}%`, icon: "✅", color: PRIMARY, bg: "#DCFCE7", spark: undefined },
    { label: "تذاكر دعم مفتوحة", value: pendingSupport, icon: "🎧", color: WARNING, bg: "#FEF3C7", spark: undefined, link: "/support" },
    { label: "عروض نشطة", value: stats.offers ?? "—", icon: "🎁", color: PURPLE, bg: "#F5F3FF", spark: undefined, link: "/offers" },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="لوحة التحكم"
        subtitle="نظرة عامة على نشاط التطبيق"
        action={
          <Link href="/analytics">
            <a className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
              style={{ background: "var(--color-primary-light)", color: PRIMARY, fontFamily: "Tajawal, sans-serif" }}>
              📈 التحليلات التفصيلية
            </a>
          </Link>
        }
      />

      <LiveBanner pending={stats.pending ?? 0} liveCount={liveCount} />
      <SmartAlerts bookings={allBookings} pendingSupport={pendingSupport} />

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statCards.map((c) => (
          <KpiCard key={c.label} {...c} />
        ))}
      </div>

      {/* ── Revenue chart + Quick Actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2">
          <MiniRevenueChart bookings={allBookings} />
        </div>
        <QuickActions />
      </div>

      {/* ── Recent Bookings ── */}
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
                  <th key={h} className="py-3 px-4 font-bold text-right" style={{ color: "#94A3B8", fontSize: 11 }}>{h}</th>
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
                    {r.scheduled_at
                      ? new Date(r.scheduled_at).toLocaleString("ar-SA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                      : "موعد مرن"}
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
                  <td colSpan={6} className="py-12 text-center" style={{ color: "#94A3B8", fontFamily: "Tajawal, sans-serif" }}>
                    لا توجد حجوزات بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
