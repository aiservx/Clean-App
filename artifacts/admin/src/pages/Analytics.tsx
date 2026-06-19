import { useEffect, useState, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Card, PageHeader } from "@/components/Layout";
import { supabase } from "@/lib/supabase";

const PRIMARY = "#16C47F";
const SECONDARY = "#7C3AED";
const DANGER = "#EF4444";
const WARNING = "#F59E0B";
const INFO = "#3B82F6";

const STATUS_COLORS: Record<string, string> = {
  completed: PRIMARY,
  pending: WARNING,
  cancelled: DANGER,
  accepted: INFO,
  on_the_way: SECONDARY,
  arrived: "#F97316",
  started: "#8B5CF6",
  rejected: "#EC4899",
  in_progress: "#0EA5E9",
};

const STATUS_AR: Record<string, string> = {
  completed: "مكتمل",
  pending: "انتظار",
  cancelled: "ملغي",
  accepted: "مقبول",
  on_the_way: "في الطريق",
  arrived: "وصل",
  started: "بدأ",
  rejected: "مرفوض",
  in_progress: "جاري",
};

// ── Arabic tooltip ──────────────────────────────────────────────────────────
function ArabicTooltip({ active, payload, label, unit = "" }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl shadow-lg px-4 py-3" style={{ background: "#fff", border: "1px solid #E2E8F0", direction: "rtl", fontFamily: "Tajawal, sans-serif" }}>
      <div className="font-bold text-gray-800 mb-1 text-sm">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-bold" style={{ color: p.color }}>{Number(p.value).toLocaleString("ar-SA")} {unit}</span>
        </div>
      ))}
    </div>
  );
}

// ── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, color, bg, sub, trend }: {
  label: string; value: string | number; icon: string;
  color: string; bg: string; sub?: string; trend?: number;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl" style={{ background: bg }}>{icon}</div>
        {trend !== undefined && (
          <span className="text-xs font-bold px-2 py-1 rounded-full" style={{
            background: trend >= 0 ? "#DCFCE7" : "#FEE2E2",
            color: trend >= 0 ? PRIMARY : DANGER
          }}>
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="font-bold" style={{ fontSize: 24, color: "#0F172A", fontFamily: "Tajawal, sans-serif" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#64748B", marginTop: 3, fontFamily: "Tajawal, sans-serif" }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: color, marginTop: 2, fontFamily: "Tajawal, sans-serif" }}>{sub}</div>}
    </Card>
  );
}

// ── Revenue Chart ───────────────────────────────────────────────────────────
function RevenueChart({ data }: { data: { date: string; revenue: number; bookings: number }[] }) {
  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="font-bold text-gray-900" style={{ fontFamily: "Tajawal, sans-serif" }}>الإيرادات اليومية (آخر 30 يوم)</h3>
        <p className="text-xs text-gray-500 mt-0.5">إجمالي الإيرادات من الحجوزات المكتملة</p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={PRIMARY} stopOpacity={0.2} />
              <stop offset="95%" stopColor={PRIMARY} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v} ر.س`} width={60} />
          <Tooltip content={<ArabicTooltip unit="ر.س" />} />
          <Area type="monotone" dataKey="revenue" name="الإيرادات" stroke={PRIMARY} strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: PRIMARY }} />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ── Bookings by Status Pie ───────────────────────────────────────────────────
function BookingStatusChart({ data }: { data: { status: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="font-bold text-gray-900" style={{ fontFamily: "Tajawal, sans-serif" }}>توزيع الحجوزات</h3>
        <p className="text-xs text-gray-500 mt-0.5">إجمالي: {total.toLocaleString("ar-SA")} حجز</p>
      </div>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width={160} height={160}>
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
              {data.map((entry) => (
                <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#CBD5E1"} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number, name: string) => [`${v.toLocaleString("ar-SA")} حجز`, STATUS_AR[name] ?? name]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-2">
          {data.map((d) => (
            <div key={d.status} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[d.status] ?? "#CBD5E1" }} />
                <span style={{ fontSize: 12, color: "#374151", fontFamily: "Tajawal, sans-serif" }}>{STATUS_AR[d.status] ?? d.status}</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-gray-900" style={{ fontSize: 13 }}>{d.count.toLocaleString("ar-SA")}</span>
                <span className="text-gray-400 text-xs mr-1">({total ? Math.round(d.count / total * 100) : 0}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ── Top Services Chart ───────────────────────────────────────────────────────
function TopServicesChart({ data }: { data: { name: string; bookings: number; revenue: number }[] }) {
  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="font-bold text-gray-900" style={{ fontFamily: "Tajawal, sans-serif" }}>أفضل الخدمات مبيعاً</h3>
        <p className="text-xs text-gray-500 mt-0.5">الخدمات الأعلى طلباً (حجوزات + إيرادات)</p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#374151", fontFamily: "Tajawal, sans-serif" }} tickLine={false} axisLine={false} width={110} />
          <Tooltip content={<ArabicTooltip />} />
          <Bar dataKey="bookings" name="الحجوزات" fill={PRIMARY} radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ── Hourly Heatmap Chart ─────────────────────────────────────────────────────
function HourlyChart({ data }: { data: { hour: string; count: number }[] }) {
  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="font-bold text-gray-900" style={{ fontFamily: "Tajawal, sans-serif" }}>خريطة الطلب (حسب الساعة)</h3>
        <p className="text-xs text-gray-500 mt-0.5">أوقات الذروة — لتحديد فترات التسعير الديناميكي</p>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
          <Tooltip content={<ArabicTooltip />} />
          <Bar dataKey="count" name="الحجوزات" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.count > 5 ? DANGER : entry.count > 2 ? WARNING : PRIMARY} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-3 flex-wrap">
        {[{ color: PRIMARY, label: "طبيعي" }, { color: WARNING, label: "مرتفع" }, { color: DANGER, label: "ذروة" }].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: color }} />
            <span style={{ fontSize: 11, color: "#64748B", fontFamily: "Tajawal, sans-serif" }}>{label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Provider Leaderboard ─────────────────────────────────────────────────────
function ProviderLeaderboard({ data }: { data: any[] }) {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-5 pb-4" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <h3 className="font-bold text-gray-900" style={{ fontFamily: "Tajawal, sans-serif" }}>🏆 لوحة شرف المزودين</h3>
        <p className="text-xs text-gray-500 mt-0.5">ترتيب بناءً على الحجوزات المكتملة والتقييم</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full" style={{ fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
              {["#", "المزود", "الحجوزات", "التقييم", "الإيرادات", "الحالة"].map((h) => (
                <th key={h} className="py-3 px-4 font-bold text-right" style={{ color: "#94A3B8", fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((p, i) => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                <td className="py-3 px-4 text-lg">{medals[i] ?? `${i + 1}`}</td>
                <td className="py-3 px-4">
                  <div className="font-medium text-gray-900" style={{ fontFamily: "Tajawal, sans-serif" }}>{p.name}</div>
                  <div className="text-xs text-gray-400">{p.phone}</div>
                </td>
                <td className="py-3 px-4 font-bold" style={{ color: PRIMARY }}>{p.completed}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-gray-900">{Number(p.rating).toFixed(1)}</span>
                    <span style={{ color: WARNING }}>★</span>
                  </div>
                </td>
                <td className="py-3 px-4 font-bold" style={{ color: "#0F172A" }}>
                  {Number(p.revenue).toLocaleString("ar-SA")} ر.س
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 rounded-full text-xs font-bold" style={{
                    background: p.available ? "#DCFCE7" : "#F1F5F9",
                    color: p.available ? PRIMARY : "#94A3B8"
                  }}>
                    {p.available ? "● متاح" : "○ غير متاح"}
                  </span>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={6} className="py-12 text-center text-gray-400">لا توجد بيانات بعد</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── CSV Export ───────────────────────────────────────────────────────────────
function exportCSV(data: any[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) => headers.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Main Analytics Page ──────────────────────────────────────────────────────
export default function Analytics() {
  const [range, setRange] = useState(30);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>({});
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [topServices, setTopServices] = useState<any[]>([]);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [allBookings, setAllBookings] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);

    const since = new Date(Date.now() - range * 24 * 60 * 60 * 1000).toISOString();

    const [bookingsRes, providersRes, usersRes, reviewsRes] = await Promise.all([
      supabase.from("bookings").select("id, status, total, scheduled_at, created_at, service_id, provider_id, services(title_ar), profiles!bookings_provider_id_fkey(full_name, phone)"),
      supabase.from("providers").select("id, rating, available, profiles(full_name, phone)").order("rating", { ascending: false }).limit(10),
      supabase.from("profiles").select("id, created_at, role").eq("role", "user"),
      supabase.from("reviews").select("rating"),
    ]);

    const bookings = bookingsRes.data ?? [];
    setAllBookings(bookings);

    const recent = bookings.filter((b) => new Date(b.created_at) >= new Date(since));
    const completed = bookings.filter((b) => b.status === "completed");
    const recentCompleted = recent.filter((b) => b.status === "completed");

    const totalRevenue = completed.reduce((s, b) => s + Number(b.total ?? 0), 0);
    const recentRevenue = recentCompleted.reduce((s, b) => s + Number(b.total ?? 0), 0);
    const avgBookingValue = completed.length > 0 ? totalRevenue / completed.length : 0;
    const cancellationRate = bookings.length > 0 ? Math.round(bookings.filter((b) => b.status === "cancelled").length / bookings.length * 100) : 0;
    const avgRating = reviewsRes.data?.length ? reviewsRes.data.reduce((s, r) => s + r.rating, 0) / reviewsRes.data.length : 0;

    setKpis({
      totalRevenue,
      recentRevenue,
      totalBookings: bookings.length,
      recentBookings: recent.length,
      totalUsers: usersRes.data?.length ?? 0,
      completedBookings: completed.length,
      cancellationRate,
      avgBookingValue,
      avgRating,
      activeProviders: (providersRes.data ?? []).filter((p: any) => p.available).length,
    });

    // Revenue by day
    const dayMap: Record<string, { revenue: number; bookings: number }> = {};
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      dayMap[key] = { revenue: 0, bookings: 0 };
    }
    for (const b of bookings) {
      if (new Date(b.created_at) < new Date(since)) continue;
      const d = new Date(b.created_at);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      if (dayMap[key]) {
        dayMap[key].bookings += 1;
        if (b.status === "completed") dayMap[key].revenue += Number(b.total ?? 0);
      }
    }
    setRevenueData(Object.entries(dayMap).map(([date, v]) => ({ date, ...v })));

    // Status distribution
    const statusMap: Record<string, number> = {};
    for (const b of bookings) statusMap[b.status] = (statusMap[b.status] ?? 0) + 1;
    setStatusData(Object.entries(statusMap).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count));

    // Top services
    const svcMap: Record<string, { name: string; bookings: number; revenue: number }> = {};
    for (const b of bookings) {
      const name = (b.services as any)?.title_ar ?? "غير محدد";
      if (!svcMap[name]) svcMap[name] = { name, bookings: 0, revenue: 0 };
      svcMap[name].bookings += 1;
      if (b.status === "completed") svcMap[name].revenue += Number(b.total ?? 0);
    }
    setTopServices(Object.values(svcMap).sort((a, b) => b.bookings - a.bookings).slice(0, 7));

    // Hourly distribution
    const hourMap: Record<number, number> = {};
    for (let h = 0; h < 24; h++) hourMap[h] = 0;
    for (const b of bookings) hourMap[new Date(b.created_at).getHours()] += 1;
    setHourlyData(Object.entries(hourMap).map(([h, count]) => ({ hour: `${h}:00`, count })));

    // Provider leaderboard
    const providerRevMap: Record<string, number> = {};
    const providerCountMap: Record<string, number> = {};
    for (const b of completed) {
      if (!b.provider_id) continue;
      providerRevMap[b.provider_id] = (providerRevMap[b.provider_id] ?? 0) + Number(b.total ?? 0);
      providerCountMap[b.provider_id] = (providerCountMap[b.provider_id] ?? 0) + 1;
    }
    const providerList = (providersRes.data ?? []).map((p: any) => ({
      id: p.id,
      name: (p.profiles as any)?.full_name ?? "—",
      phone: (p.profiles as any)?.phone ?? "",
      rating: p.rating ?? 0,
      available: p.available,
      completed: providerCountMap[p.id] ?? 0,
      revenue: providerRevMap[p.id] ?? 0,
    })).sort((a, b) => b.completed - a.completed);
    setProviders(providerList);

    setLoading(false);
  }, [range]);

  useEffect(() => { loadData(); }, [loadData]);

  const completionRate = kpis.totalBookings ? Math.round(kpis.completedBookings / kpis.totalBookings * 100) : 0;

  return (
    <div className="p-6 max-w-7xl" dir="rtl">
      <PageHeader
        title="📊 لوحة التحليلات"
        subtitle="رؤية تجارية شاملة مبنية على البيانات"
        action={
          <div className="flex items-center gap-2">
            <select
              value={range}
              onChange={(e) => setRange(Number(e.target.value))}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium"
              style={{ fontFamily: "Tajawal, sans-serif" }}
            >
              <option value={7}>آخر 7 أيام</option>
              <option value={30}>آخر 30 يوم</option>
              <option value={90}>آخر 3 أشهر</option>
            </select>
            <button
              onClick={() => exportCSV(allBookings.map((b) => ({
                "رقم الحجز": b.id.slice(0, 8).toUpperCase(),
                "الحالة": b.status,
                "المبلغ": b.total ?? 0,
                "التاريخ": new Date(b.created_at).toLocaleDateString("ar-SA"),
                "الخدمة": (b.services as any)?.title_ar ?? "",
              })), `nazafa-bookings-${new Date().toISOString().slice(0, 10)}.csv`)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
              style={{ background: "#F1F5F9", color: "#374151", fontFamily: "Tajawal, sans-serif" }}
            >
              📥 تصدير CSV
            </button>
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
              style={{ background: "var(--color-primary-light)", color: "var(--color-primary)", fontFamily: "Tajawal, sans-serif" }}
            >
              🔄 تحديث
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin mx-auto mb-3" style={{ borderColor: PRIMARY, borderTopColor: "transparent" }} />
            <div style={{ color: "#64748B", fontFamily: "Tajawal, sans-serif" }}>جاري تحليل البيانات…</div>
          </div>
        </div>
      ) : (
        <>
          {/* ── KPI Row ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <KpiCard label="إجمالي الإيرادات" value={`${kpis.totalRevenue?.toLocaleString("ar-SA")} ر.س`} icon="💰" color={PRIMARY} bg="#DCFCE7" sub={`${kpis.completedBookings} حجز مكتمل`} />
            <KpiCard label={`إيرادات آخر ${range} يوم`} value={`${kpis.recentRevenue?.toLocaleString("ar-SA")} ر.س`} icon="📈" color={INFO} bg="#EFF6FF" sub={`${kpis.recentBookings} حجز جديد`} />
            <KpiCard label="متوسط قيمة الحجز" value={`${Math.round(kpis.avgBookingValue ?? 0).toLocaleString("ar-SA")} ر.س`} icon="🎯" color={SECONDARY} bg="#F5F3FF" sub="لكل حجز مكتمل" />
            <KpiCard label="معدل الإتمام" value={`${completionRate}%`} icon="✅" color={PRIMARY} bg="#DCFCE7" sub={`معدل إلغاء: ${kpis.cancellationRate}%`} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <KpiCard label="إجمالي العملاء" value={kpis.totalUsers?.toLocaleString("ar-SA")} icon="👥" color={INFO} bg="#EFF6FF" />
            <KpiCard label="المزودون المتاحون" value={kpis.activeProviders} icon="👷" color={WARNING} bg="#FEF3C7" sub="الآن على الهواء" />
            <KpiCard label="متوسط التقييم" value={`${Number(kpis.avgRating ?? 0).toFixed(1)} ★`} icon="⭐" color={WARNING} bg="#FEF3C7" />
            <KpiCard label="إجمالي الحجوزات" value={kpis.totalBookings?.toLocaleString("ar-SA")} icon="📅" color={SECONDARY} bg="#F5F3FF" />
          </div>

          {/* ── Revenue Chart + Status Pie ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <div className="lg:col-span-2">
              <RevenueChart data={revenueData} />
            </div>
            <BookingStatusChart data={statusData} />
          </div>

          {/* ── Top Services + Hourly ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <TopServicesChart data={topServices} />
            <HourlyChart data={hourlyData} />
          </div>

          {/* ── Provider Leaderboard ── */}
          <ProviderLeaderboard data={providers} />
        </>
      )}
    </div>
  );
}
