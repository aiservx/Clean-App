import { useEffect, useState, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { supabase } from "@/lib/supabase";

// ── Arabic Tooltip ────────────────────────────────────────────────────────────
function ArabicTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl shadow-lg px-4 py-3 text-sm" dir="rtl"
      style={{ background: "#fff", border: "1px solid #E2E8F0", fontFamily: "Tajawal, sans-serif" }}>
      <div className="font-bold text-gray-800 mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-bold" style={{ color: p.color }}>{Number(p.value).toLocaleString("ar-SA")}</span>
        </div>
      ))}
    </div>
  );
}

type MonthlyData = {
  month: string;
  new_users: number;
  returning_users: number;
  total: number;
  retention_rate: number;
};

type RetentionBucket = { label: string; rate: number; color: string };

export default function Cohorts() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("bookings")
        .select("id, user_id, created_at, status")
        .not("user_id", "is", null)
        .order("created_at", { ascending: true });
      setBookings(data || []);
      setLoading(false);
    })();
  }, []);

  // ── Monthly new vs returning analysis ──────────────────────────────────────
  const monthlyData = useMemo((): MonthlyData[] => {
    if (!bookings.length) return [];

    const AR_MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
    const firstBooking: Record<string, string> = {};
    const byMonth: Record<string, { new_users: Set<string>; returning_users: Set<string> }> = {};

    for (const b of bookings) {
      if (!b.user_id || !b.created_at) continue;
      const d = new Date(b.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${AR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;

      if (!byMonth[key]) byMonth[key] = { new_users: new Set(), returning_users: new Set() };

      if (!firstBooking[b.user_id]) {
        firstBooking[b.user_id] = key;
        byMonth[key].new_users.add(b.user_id);
      } else if (firstBooking[b.user_id] !== key) {
        byMonth[key].returning_users.add(b.user_id);
      }
    }

    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-9) // Last 9 months
      .map(([key, v]) => {
        const d = new Date(key + "-01");
        const total = v.new_users.size + v.returning_users.size;
        return {
          month: `${AR_MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
          new_users: v.new_users.size,
          returning_users: v.returning_users.size,
          total,
          retention_rate: total > 0 ? Math.round((v.returning_users.size / total) * 100) : 0,
        };
      });
  }, [bookings]);

  // ── Retention windows ──────────────────────────────────────────────────────
  const retentionBuckets = useMemo((): RetentionBucket[] => {
    if (!bookings.length) return [];

    const userBookings: Record<string, Date[]> = {};
    for (const b of bookings) {
      if (!b.user_id || b.status === "cancelled") continue;
      if (!userBookings[b.user_id]) userBookings[b.user_id] = [];
      userBookings[b.user_id].push(new Date(b.created_at));
    }

    const users = Object.values(userBookings).filter((dates) => dates.length >= 1);
    const total = users.length;
    if (!total) return [];

    const retained7  = users.filter((d) => {
      const sorted = d.sort((a, b) => a.getTime() - b.getTime());
      return sorted.length >= 2 && (sorted[1].getTime() - sorted[0].getTime()) <= 7 * 86400000;
    }).length;
    const retained30 = users.filter((d) => d.length >= 2).length;
    const retained90 = users.filter((d) => d.length >= 3).length;

    return [
      { label: "استبقاء 7 أيام",  rate: Math.round((retained7  / total) * 100), color: "#16C47F" },
      { label: "استبقاء 30 يوم",  rate: Math.round((retained30 / total) * 100), color: "#3B82F6" },
      { label: "استبقاء 90 يوم",  rate: Math.round((retained90 / total) * 100), color: "#8B5CF6" },
    ];
  }, [bookings]);

  // ── LTV estimation ─────────────────────────────────────────────────────────
  const ltvData = useMemo(() => {
    if (!bookings.length) return { avgOrders: 0, avgLTV: 0, topLTV: 0 };
    const userCounts: Record<string, number> = {};
    for (const b of bookings) {
      if (b.user_id && b.status === "completed") {
        userCounts[b.user_id] = (userCounts[b.user_id] || 0) + 1;
      }
    }
    const counts = Object.values(userCounts);
    if (!counts.length) return { avgOrders: 0, avgLTV: 0, topLTV: 0 };
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    return {
      avgOrders: Math.round(avg * 10) / 10,
      avgLTV: Math.round(avg * 175),
      topLTV: Math.max(...counts) * 175,
    };
  }, [bookings]);

  const totalUsers = useMemo(() => new Set(bookings.map((b) => b.user_id).filter(Boolean)).size, [bookings]);
  const returningUsers = useMemo(() => {
    const counts: Record<string, number> = {};
    bookings.forEach((b) => { if (b.user_id) counts[b.user_id] = (counts[b.user_id] || 0) + 1; });
    return Object.values(counts).filter((c) => c > 1).length;
  }, [bookings]);

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📊 تحليل الاستبقاء والشرائح</h1>
        <p className="text-gray-500 mt-1">كم % من عملائنا يعودون؟ وما قيمة كل عميل مدى الحياة؟</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "إجمالي المستخدمين", value: loading ? "…" : totalUsers.toLocaleString("ar-SA"), icon: "👥", color: "bg-blue-50 border-blue-200" },
          { label: "عملاء عائدون", value: loading ? "…" : returningUsers.toLocaleString("ar-SA"), icon: "🔄", color: "bg-green-50 border-green-200" },
          { label: "متوسط الطلبات/عميل", value: loading ? "…" : ltvData.avgOrders, icon: "📋", color: "bg-purple-50 border-purple-200" },
          { label: "LTV متوسط (ر.س)", value: loading ? "…" : ltvData.avgLTV.toLocaleString("ar-SA"), icon: "💰", color: "bg-amber-50 border-amber-200" },
        ].map((k) => (
          <div key={k.label} className={`rounded-2xl border p-5 ${k.color}`}>
            <div className="text-3xl mb-2">{k.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{k.value}</div>
            <div className="text-sm text-gray-600 mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Retention Windows */}
      <div className="bg-white rounded-2xl border shadow-sm p-6">
        <h2 className="font-bold text-gray-800 text-lg mb-4">🔁 نوافذ الاستبقاء</h2>
        {loading ? (
          <div className="text-center text-gray-400 py-8">جاري التحليل…</div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {retentionBuckets.map((b) => (
              <div key={b.label} className="text-center rounded-2xl p-6" style={{ background: b.color + "15", border: `2px solid ${b.color}30` }}>
                <div className="text-4xl font-bold mb-1" style={{ color: b.color }}>{b.rate}%</div>
                <div className="text-sm text-gray-600">{b.label}</div>
                <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${b.rate}%`, background: b.color }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Monthly New vs Returning */}
      <div className="bg-white rounded-2xl border shadow-sm p-6">
        <h2 className="font-bold text-gray-800 text-lg mb-4">📅 عملاء جدد مقابل عائدون (شهرياً)</h2>
        {loading ? (
          <div className="text-center text-gray-400 py-8">جاري التحميل…</div>
        ) : monthlyData.length === 0 ? (
          <div className="text-center text-gray-400 py-8">لا تتوفر بيانات كافية</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontFamily: "Tajawal, sans-serif", fontSize: 11 }} />
              <YAxis tick={{ fontFamily: "Tajawal, sans-serif", fontSize: 11 }} />
              <Tooltip content={<ArabicTooltip />} />
              <Legend wrapperStyle={{ fontFamily: "Tajawal, sans-serif", fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="new_users" name="عملاء جدد" fill="#3B82F6" radius={[6, 6, 0, 0]} />
              <Bar dataKey="returning_users" name="عملاء عائدون" fill="#16C47F" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Retention Rate Trend */}
      {monthlyData.length > 0 && (
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <h2 className="font-bold text-gray-800 text-lg mb-4">📈 معدل الاستبقاء الشهري (%)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontFamily: "Tajawal, sans-serif", fontSize: 11 }} />
              <YAxis unit="%" domain={[0, 100]} tick={{ fontFamily: "Tajawal, sans-serif", fontSize: 11 }} />
              <Tooltip content={<ArabicTooltip />} />
              <Line type="monotone" dataKey="retention_rate" name="معدل الاستبقاء" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 5, fill: "#8B5CF6" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* LTV Segments */}
      <div className="bg-white rounded-2xl border shadow-sm p-6">
        <h2 className="font-bold text-gray-800 text-lg mb-1">💎 قيمة العميل مدى الحياة (LTV)</h2>
        <p className="text-sm text-gray-500 mb-5">بافتراض متوسط حجز = 175 ر.س</p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "متوسط الطلبات/عميل", value: ltvData.avgOrders, unit: "طلب", color: "#3B82F6" },
            { label: "متوسط LTV/عميل", value: `${ltvData.avgLTV.toLocaleString("ar-SA")} ر.س`, unit: "", color: "#16C47F" },
            { label: "أعلى LTV (أفضل عميل)", value: `${ltvData.topLTV.toLocaleString("ar-SA")} ر.س`, unit: "", color: "#F59E0B" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl p-5 text-center" style={{ background: s.color + "12", border: `2px solid ${s.color}30` }}>
              <div className="text-3xl font-bold mb-1" style={{ color: s.color }}>{s.value}</div>
              {s.unit && <div className="text-xs text-gray-500">{s.unit}</div>}
              <div className="text-sm text-gray-600 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
