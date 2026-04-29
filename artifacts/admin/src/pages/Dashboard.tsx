import { useEffect, useState } from "react";
import { Card, PageHeader } from "@/components/Layout";
import { supabase } from "@/lib/supabase";

export default function Dashboard() {
  const [stats, setStats] = useState<any>({});
  const [recent, setRecent] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const [c, p, b, s, o] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "user"),
        supabase.from("providers").select("id", { count: "exact", head: true }),
        supabase.from("bookings").select("id, total", { count: "exact" }),
        supabase.from("services").select("id", { count: "exact", head: true }),
        supabase.from("offers").select("id", { count: "exact", head: true }).eq("active", true),
      ]);
      const totalRev = (b.data ?? []).reduce((s: number, x: any) => s + Number(x.total ?? 0), 0);
      setStats({
        users: c.count ?? 0,
        providers: p.count ?? 0,
        bookings: b.count ?? 0,
        services: s.count ?? 0,
        offers: o.count ?? 0,
        revenue: totalRev,
      });
      const { data } = await supabase
        .from("bookings")
        .select("id, status, total_price, scheduled_at, profiles!bookings_user_id_fkey(full_name)")
        .order("created_at", { ascending: false })
        .limit(8);
      setRecent(data ?? []);
    })();
  }, []);

  const cards = [
    { label: "العملاء", value: stats.users, icon: "👥", grad: "from-blue-500 to-blue-600" },
    { label: "مقدمو الخدمة", value: stats.providers, icon: "👷", grad: "from-purple-500 to-purple-600" },
    { label: "الحجوزات", value: stats.bookings, icon: "📅", grad: "from-emerald-500 to-emerald-600" },
    { label: "الخدمات", value: stats.services, icon: "🧹", grad: "from-amber-500 to-amber-600" },
    { label: "العروض النشطة", value: stats.offers, icon: "🎁", grad: "from-pink-500 to-pink-600" },
    { label: "إجمالي الإيرادات (ر.س)", value: stats.revenue?.toLocaleString?.("ar-SA") ?? 0, icon: "💰", grad: "from-teal-500 to-teal-600" },
  ];

  return (
    <div className="p-8">
      <PageHeader title="لوحة التحكم" subtitle="نظرة عامة على نشاط التطبيق" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${c.grad} flex items-center justify-center text-white text-xl mb-3`}>
              {c.icon}
            </div>
            <div className="text-2xl font-bold text-gray-900">{c.value ?? "—"}</div>
            <div className="text-sm text-gray-500 mt-1">{c.label}</div>
          </Card>
        ))}
      </div>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">آخر الحجوزات</h2>
          <span className="text-xs text-gray-500">{recent.length} نتيجة</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-xs text-gray-500 border-b border-gray-100">
                <th className="py-3 px-2">الحجز</th>
                <th className="py-3 px-2">العميل</th>
                <th className="py-3 px-2">الموعد</th>
                <th className="py-3 px-2">المبلغ</th>
                <th className="py-3 px-2">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-2 font-mono text-xs text-gray-500">#{r.id.slice(0, 8)}</td>
                  <td className="py-3 px-2">{r.profiles?.full_name ?? "—"}</td>
                  <td className="py-3 px-2 text-gray-600">{r.scheduled_at ? new Date(r.scheduled_at).toLocaleString("ar-SA") : "—"}</td>
                  <td className="py-3 px-2 font-bold text-emerald-600">{Number(r.total_price ?? 0).toLocaleString("ar-SA")} ر.س</td>
                  <td className="py-3 px-2">
                    <span className="inline-block px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">{r.status}</span>
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-gray-400">لا توجد حجوزات بعد</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
