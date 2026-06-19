import { useState } from "react";
import { supabase } from "@/lib/supabase";

type PromoCode = {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  min_order: number;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  active: boolean;
  description: string;
};

const DEMO_CODES: PromoCode[] = [
  { id: "1", code: "NADHAFA10", type: "percent", value: 10, min_order: 100, max_uses: 500, used_count: 127, expires_at: "2026-12-31", active: true, description: "خصم 10% للعملاء الجدد" },
  { id: "2", code: "WELCOME50", type: "fixed",   value: 50, min_order: 150, max_uses: 200, used_count: 89,  expires_at: "2026-09-30", active: true, description: "خصم 50 ريال على الطلب الأول" },
  { id: "3", code: "VIP20",     type: "percent", value: 20, min_order: 200, max_uses: 100, used_count: 45,  expires_at: "2026-08-01", active: false, description: "خصم VIP 20% للعضوية المميزة" },
  { id: "4", code: "RAMADAN",   type: "percent", value: 15, min_order: 120, max_uses: 1000, used_count: 532, expires_at: "2026-04-10", active: false, description: "عرض رمضان المبارك" },
];

const EMPTY_FORM: { code: string; type: "percent" | "fixed"; value: number; min_order: number; max_uses: number; expires_at: string; description: string } = { code: "", type: "percent", value: 10, min_order: 100, max_uses: 200, expires_at: "", description: "" };

export default function PromoCodes() {
  const [codes, setCodes] = useState<PromoCode[]>(DEMO_CODES);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = codes.filter(c => {
    const matchSearch = c.code.toLowerCase().includes(search.toLowerCase()) || c.description.includes(search);
    const matchFilter = filterActive === "all" || (filterActive === "active" ? c.active : !c.active);
    return matchSearch && matchFilter;
  });

  const totalSaved = codes.reduce((s, c) => s + c.used_count * (c.type === "fixed" ? c.value : c.value * 1.5), 0);
  const activeCodes = codes.filter(c => c.active).length;
  const totalUses = codes.reduce((s, c) => s + c.used_count, 0);

  const toggleActive = (id: string) => {
    setCodes(prev => prev.map(c => c.id === id ? { ...c, active: !c.active } : c));
  };

  const deleteCode = (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الكود؟")) return;
    setCodes(prev => prev.filter(c => c.id !== id));
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    const newCode: PromoCode = {
      id: Date.now().toString(),
      code: form.code.toUpperCase().trim(),
      type: form.type,
      value: Number(form.value),
      min_order: Number(form.min_order),
      max_uses: Number(form.max_uses),
      used_count: 0,
      expires_at: form.expires_at || null,
      active: true,
      description: form.description,
    };
    setCodes(prev => [newCode, ...prev]);
    setForm(EMPTY_FORM);
    setShowForm(false);
    setSaving(false);
  };

  const usagePercent = (c: PromoCode) => Math.min(100, Math.round((c.used_count / c.max_uses) * 100));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏷️ أكواد الخصم</h1>
          <p className="text-gray-500 text-sm mt-1">إنشاء وإدارة أكواد الخصم للعملاء</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <span className="text-lg">+</span> كود جديد
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "أكواد نشطة", value: activeCodes, icon: "✅", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
          { label: "إجمالي الاستخدامات", value: totalUses.toLocaleString("ar-SA"), icon: "📊", color: "text-blue-600 bg-blue-50 border-blue-200" },
          { label: "إجمالي الخصم المُقدَّم", value: `~${Math.round(totalSaved).toLocaleString("ar-SA")} ر.س`, icon: "💰", color: "text-amber-600 bg-amber-50 border-amber-200" },
          { label: "إجمالي الأكواد", value: codes.length, icon: "🏷️", color: "text-purple-600 bg-purple-50 border-purple-200" },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-4 ${s.color}`}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-sm opacity-75 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <input
          type="text"
          placeholder="🔍 ابحث بالكود أو الوصف..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          dir="rtl"
        />
        <div className="flex gap-2">
          {(["all", "active", "inactive"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterActive(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filterActive === f ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {f === "all" ? "الكل" : f === "active" ? "نشطة" : "معطّلة"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-right">
                <th className="px-4 py-3 font-semibold">الكود</th>
                <th className="px-4 py-3 font-semibold">الخصم</th>
                <th className="px-4 py-3 font-semibold">الوصف</th>
                <th className="px-4 py-3 font-semibold">الاستخدام</th>
                <th className="px-4 py-3 font-semibold">الانتهاء</th>
                <th className="px-4 py-3 font-semibold">الحالة</th>
                <th className="px-4 py-3 font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    <div className="text-4xl mb-2">🏷️</div>
                    <div>لا توجد أكواد مطابقة</div>
                  </td>
                </tr>
              )}
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <code className="bg-gray-100 px-2.5 py-1 rounded-lg font-mono font-bold text-emerald-700 text-sm">{c.code}</code>
                      <button
                        onClick={() => copyCode(c.code, c.id)}
                        className="text-gray-400 hover:text-emerald-600 transition-colors"
                        title="نسخ الكود"
                      >
                        {copiedId === c.id ? "✅" : "📋"}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${c.type === "percent" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                      {c.type === "percent" ? `${c.value}%` : `${c.value} ر.س`}
                    </span>
                    <div className="text-xs text-gray-400 mt-0.5">حد أدنى {c.min_order} ر.س</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate" dir="rtl">{c.description}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 w-20">
                        <div
                          className={`h-1.5 rounded-full ${usagePercent(c) > 80 ? "bg-red-500" : usagePercent(c) > 50 ? "bg-amber-500" : "bg-emerald-500"}`}
                          style={{ width: `${usagePercent(c)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">{c.used_count}/{c.max_uses}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString("ar-SA") : "بلا انتهاء"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(c.id)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${c.active ? "bg-emerald-500" : "bg-gray-300"}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow ${c.active ? "translate-x-1" : "translate-x-4"}`} />
                    </button>
                    <span className={`mr-2 text-xs ${c.active ? "text-emerald-600" : "text-gray-400"}`}>{c.active ? "نشط" : "معطّل"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => deleteCode(c.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors text-lg"
                      title="حذف"
                    >🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" dir="rtl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">🏷️ إنشاء كود خصم جديد</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">كود الخصم *</label>
                <input
                  required
                  type="text"
                  placeholder="مثال: SUMMER30"
                  value={form.code}
                  onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">نوع الخصم</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(p => ({ ...p, type: e.target.value as "percent" | "fixed" }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  >
                    <option value="percent">نسبة مئوية %</option>
                    <option value="fixed">مبلغ ثابت ر.س</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">القيمة</label>
                  <input
                    required type="number" min={1} max={form.type === "percent" ? 100 : 9999}
                    value={form.value}
                    onChange={e => setForm(p => ({ ...p, value: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">أقل طلب (ر.س)</label>
                  <input
                    type="number" min={0} value={form.min_order}
                    onChange={e => setForm(p => ({ ...p, min_order: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">أقصى استخدام</label>
                  <input
                    type="number" min={1} value={form.max_uses}
                    onChange={e => setForm(p => ({ ...p, max_uses: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الانتهاء (اختياري)</label>
                <input
                  type="date" value={form.expires_at}
                  onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                <input
                  type="text" placeholder="وصف قصير للكود"
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                >
                  {saving ? "جاري الحفظ..." : "✅ إنشاء الكود"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
