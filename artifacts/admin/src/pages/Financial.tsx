import { useEffect, useState, useCallback } from "react";
import { Card, PageHeader } from "@/components/Layout";
import { supabase } from "@/lib/supabase";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const PRIMARY = "#16C47F";
const PURPLE  = "#7C3AED";
const AMBER   = "#F59E0B";
const INFO    = "#3B82F6";
const DANGER  = "#EF4444";

const COMMISSION_RATE = 0.15; // 15% platform commission

type Booking = {
  id: string;
  total: number | null;
  status: string;
  created_at: string;
  provider_id: string | null;
  providers?: { profiles?: { full_name?: string | null } } | null;
  services?: { title_ar?: string | null } | null;
};

function fmt(n: number) {
  return n.toLocaleString("ar-SA", { maximumFractionDigits: 0 }) + " ر.س";
}

function pct(a: number, b: number) {
  if (!b) return "—";
  return ((a / b) * 100).toFixed(1) + "%";
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon, color, bg,
}: { label: string; value: string; sub?: string; icon: string; color: string; bg: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: bg }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-500 mb-1" style={{ fontFamily: "Tajawal, sans-serif" }}>{label}</div>
          <div className="font-bold text-2xl" style={{ color: "#0F172A", fontFamily: "Tajawal, sans-serif" }}>{value}</div>
          {sub && <div className="text-xs font-medium mt-0.5" style={{ color, fontFamily: "Tajawal, sans-serif" }}>{sub}</div>}
        </div>
      </div>
    </Card>
  );
}

// ── Monthly chart builder ─────────────────────────────────────────────────────
function buildMonthlyData(bookings: Booking[], months = 6) {
  const result = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("ar-SA", { month: "short" });
    const monthBookings = bookings.filter(
      (b) => b.status === "completed" && b.created_at?.startsWith(key)
    );
    const revenue = monthBookings.reduce((s, b) => s + Number(b.total ?? 0), 0);
    const commission = Math.round(revenue * COMMISSION_RATE);
    const providerEarnings = revenue - commission;
    result.push({ label, revenue, commission, providerEarnings, count: monthBookings.length });
  }
  return result;
}

// ── Top Providers by Earnings ─────────────────────────────────────────────────
function buildTopProviders(bookings: Booking[]) {
  const map: Record<string, { name: string; revenue: number; count: number }> = {};
  bookings
    .filter((b) => b.status === "completed" && b.provider_id)
    .forEach((b) => {
      const pid = b.provider_id!;
      const name = (b.providers as any)?.profiles?.full_name ?? "غير معروف";
      if (!map[pid]) map[pid] = { name, revenue: 0, count: 0 };
      map[pid].revenue += Number(b.total ?? 0);
      map[pid].count += 1;
    });
  return Object.values(map)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
}

// ── Recent Transactions ────────────────────────────────────────────────────────
function buildTransactions(bookings: Booking[]) {
  return bookings
    .filter((b) => b.status === "completed")
    .slice(0, 20)
    .map((b) => ({
      id: b.id.slice(0, 8),
      provider: (b.providers as any)?.profiles?.full_name ?? "—",
      service: (b.services as any)?.title_ar ?? "—",
      total: Number(b.total ?? 0),
      commission: Math.round(Number(b.total ?? 0) * COMMISSION_RATE),
      providerEarning: Math.round(Number(b.total ?? 0) * (1 - COMMISSION_RATE)),
      date: new Date(b.created_at).toLocaleDateString("ar-SA"),
    }));
}

export default function FinancialPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"30" | "90" | "180">("90");

  const load = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - Number(range) * 86400000).toISOString();
    const { data } = await supabase
      .from("bookings")
      .select(`
        id, total, status, created_at, provider_id,
        providers:provider_id ( profiles:id ( full_name ) ),
        services:service_id ( title_ar )
      `)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000);
    setBookings((data as any[]) ?? []);
    setLoading(false);
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const completed = bookings.filter((b) => b.status === "completed");
  const totalRevenue = completed.reduce((s, b) => s + Number(b.total ?? 0), 0);
  const totalCommission = Math.round(totalRevenue * COMMISSION_RATE);
  const totalProviderEarnings = totalRevenue - totalCommission;
  const pendingTotal = bookings
    .filter((b) => ["pending", "accepted", "on_the_way", "arrived", "started", "in_progress"].includes(b.status))
    .reduce((s, b) => s + Number(b.total ?? 0), 0);
  const avgOrderValue = completed.length ? Math.round(totalRevenue / completed.length) : 0;

  const monthlyData = buildMonthlyData(bookings);
  const topProviders = buildTopProviders(bookings);
  const transactions = buildTransactions(bookings);

  const pieData = [
    { name: "عمولة المنصة", value: totalCommission, color: PRIMARY },
    { name: "أرباح المزودين", value: totalProviderEarnings, color: INFO },
  ];

  const exportCSV = () => {
    const rows = [
      ["المعرف", "المزود", "الخدمة", "الإجمالي", "عمولة المنصة", "أرباح المزود", "التاريخ"],
      ...transactions.map((t) => [t.id, t.provider, t.service, t.total, t.commission, t.providerEarning, t.date]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader
          title="التقارير المالية"
          subtitle="إيرادات المنصة، عمولات، وأرباح المزودين"
        />
        <div className="flex items-center gap-3">
          {/* Range selector */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200">
            {(["30", "90", "180"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className="px-4 py-2 text-sm transition-colors"
                style={{
                  fontFamily: "Tajawal, sans-serif",
                  background: range === r ? PRIMARY : "white",
                  color: range === r ? "white" : "#64748B",
                }}
              >
                {r === "30" ? "30 يوم" : r === "90" ? "90 يوم" : "6 أشهر"}
              </button>
            ))}
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: PRIMARY, fontFamily: "Tajawal, sans-serif" }}
          >
            📥 تصدير CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400" style={{ fontFamily: "Tajawal, sans-serif" }}>
          جاري تحميل البيانات…
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="إجمالي الإيرادات"
              value={fmt(totalRevenue)}
              sub={`${completed.length} طلب مكتمل`}
              icon="💰"
              color={PRIMARY}
              bg="#DCFCE7"
            />
            <KpiCard
              label="عمولة المنصة (15%)"
              value={fmt(totalCommission)}
              sub={pct(totalCommission, totalRevenue) + " من الإيرادات"}
              icon="🏦"
              color={PURPLE}
              bg="#EDE9FE"
            />
            <KpiCard
              label="أرباح المزودين"
              value={fmt(totalProviderEarnings)}
              sub={pct(totalProviderEarnings, totalRevenue) + " من الإيرادات"}
              icon="👷"
              color={INFO}
              bg="#DBEAFE"
            />
            <KpiCard
              label="طلبات نشطة (مؤقتاً)"
              value={fmt(pendingTotal)}
              sub={`متوسط الطلب: ${fmt(avgOrderValue)}`}
              icon="⏳"
              color={AMBER}
              bg="#FEF3C7"
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Revenue trend */}
            <Card className="p-5 lg:col-span-2">
              <div className="font-bold mb-4 text-gray-800" style={{ fontFamily: "Tajawal, sans-serif", fontSize: 15 }}>
                📈 الإيرادات والعمولات الشهرية
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PRIMARY} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={PRIMARY} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PURPLE} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={PURPLE} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fontFamily: "Tajawal, sans-serif" }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(val: number, name: string) => [fmt(val), name]}
                    labelStyle={{ fontFamily: "Tajawal, sans-serif" }}
                    contentStyle={{ borderRadius: 12, fontFamily: "Tajawal, sans-serif" }}
                  />
                  <Legend wrapperStyle={{ fontFamily: "Tajawal, sans-serif", fontSize: 12 }} />
                  <Area type="monotone" dataKey="revenue" name="إجمالي الإيرادات" stroke={PRIMARY} fill="url(#gr)" strokeWidth={2} />
                  <Area type="monotone" dataKey="commission" name="عمولة المنصة" stroke={PURPLE} fill="url(#gc)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Pie chart */}
            <Card className="p-5 flex flex-col items-center justify-center">
              <div className="font-bold mb-4 text-gray-800 self-start" style={{ fontFamily: "Tajawal, sans-serif", fontSize: 15 }}>
                🥧 توزيع الإيرادات
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: 12, fontFamily: "Tajawal, sans-serif" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-full space-y-2 mt-2">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-sm" style={{ fontFamily: "Tajawal, sans-serif" }}>
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full inline-block" style={{ background: d.color }} />
                      {d.name}
                    </span>
                    <span className="font-bold" style={{ color: d.color }}>{fmt(d.value)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Top Providers + Monthly Orders */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top providers bar chart */}
            <Card className="p-5">
              <div className="font-bold mb-4 text-gray-800" style={{ fontFamily: "Tajawal, sans-serif", fontSize: 15 }}>
                🏆 أعلى المزودين إيراداً
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topProviders.slice(0, 6)} layout="vertical" margin={{ left: 16, right: 16, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fontFamily: "Tajawal, sans-serif" }} width={80} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: 12, fontFamily: "Tajawal, sans-serif" }} />
                  <Bar dataKey="revenue" name="الإيرادات" fill={INFO} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Monthly orders count */}
            <Card className="p-5">
              <div className="font-bold mb-4 text-gray-800" style={{ fontFamily: "Tajawal, sans-serif", fontSize: 15 }}>
                📦 عدد الطلبات الشهرية
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fontFamily: "Tajawal, sans-serif" }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontFamily: "Tajawal, sans-serif" }} />
                  <Bar dataKey="count" name="عدد الطلبات" fill={AMBER} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Transactions Table */}
          <Card className="p-5">
            <div className="font-bold mb-4 text-gray-800" style={{ fontFamily: "Tajawal, sans-serif", fontSize: 15 }}>
              📋 آخر المعاملات
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ fontFamily: "Tajawal, sans-serif" }}>
                <thead>
                  <tr className="border-b border-gray-100">
                    {["المعرف", "المزود", "الخدمة", "إجمالي الطلب", "عمولة المنصة", "أرباح المزود", "التاريخ"].map((h) => (
                      <th key={h} className="text-right py-2 px-3 font-semibold text-gray-500 text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-400">لا توجد معاملات في هذه الفترة</td>
                    </tr>
                  ) : (
                    transactions.map((t) => (
                      <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-3 text-gray-400 font-mono text-xs">#{t.id}</td>
                        <td className="py-3 px-3 font-medium text-gray-700">{t.provider}</td>
                        <td className="py-3 px-3 text-gray-600">{t.service}</td>
                        <td className="py-3 px-3 font-bold text-gray-800">{t.total.toLocaleString("ar-SA")} ر.س</td>
                        <td className="py-3 px-3">
                          <span className="font-medium px-2 py-0.5 rounded-lg text-xs" style={{ background: "#EDE9FE", color: PURPLE }}>
                            {t.commission.toLocaleString("ar-SA")} ر.س
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-medium px-2 py-0.5 rounded-lg text-xs" style={{ background: "#DCFCE7", color: PRIMARY }}>
                            {t.providerEarning.toLocaleString("ar-SA")} ر.س
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-400 text-xs">{t.date}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
