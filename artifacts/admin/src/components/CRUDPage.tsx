import { useEffect, useState, ReactNode } from "react";
import { Card, PageHeader } from "./Layout";
import { supabase } from "@/lib/supabase";

export type Field = {
  key: string;
  label: string;
  type?: "text" | "number" | "textarea" | "select" | "boolean" | "date";
  options?: { value: any; label: string }[];
  required?: boolean;
  placeholder?: string;
  hideInForm?: boolean;
  hideInList?: boolean;
  format?: (v: any, row: any) => ReactNode;
};

export function CRUDPage({
  title,
  subtitle,
  table,
  fields,
  selectQuery,
  orderBy = "created_at",
  ascending = false,
  defaultValues = {},
  beforeInsert,
}: {
  title: string;
  subtitle?: string;
  table: string;
  fields: Field[];
  selectQuery?: string;
  orderBy?: string;
  ascending?: boolean;
  defaultValues?: Record<string, any>;
  beforeInsert?: (row: any) => any;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [search, setSearch] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    let q = supabase.from(table).select(selectQuery ?? "*").order(orderBy, { ascending });
    const { data, error } = await q;
    if (error) setErr(error.message);
    else setRows(data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [table]);

  function startNew() {
    setEditing(null);
    setForm({ ...defaultValues });
    setOpen(true);
    setErr("");
  }
  function startEdit(row: any) {
    setEditing(row);
    setForm({ ...row });
    setOpen(true);
    setErr("");
  }
  async function save() {
    setErr("");
    let payload = { ...form };
    fields.forEach((f) => {
      if (f.type === "number" && payload[f.key] !== undefined && payload[f.key] !== "")
        payload[f.key] = Number(payload[f.key]);
      if (f.type === "boolean") payload[f.key] = !!payload[f.key];
    });
    if (beforeInsert) payload = beforeInsert(payload);
    if (editing) {
      const { error } = await supabase.from(table).update(payload).eq("id", editing.id);
      if (error) return setErr(error.message);
    } else {
      const { error } = await supabase.from(table).insert(payload);
      if (error) return setErr(error.message);
    }
    setOpen(false);
    load();
  }
  async function remove(row: any) {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    const { error } = await supabase.from(table).delete().eq("id", row.id);
    if (error) return alert(error.message);
    load();
  }

  const visibleFields = fields.filter((f) => !f.hideInList);
  const filtered = search
    ? rows.filter((r) =>
        visibleFields.some((f) => String(r[f.key] ?? "").toLowerCase().includes(search.toLowerCase()))
      )
    : rows;

  return (
    <div className="p-8">
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={
          <button onClick={startNew} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-sm hover:opacity-90">
            + إضافة جديد
          </button>
        }
      />
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث..."
            className="w-72 px-4 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          <span className="text-xs text-gray-500">{filtered.length} عنصر</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-xs text-gray-500 border-b border-gray-100">
                {visibleFields.map((f) => (
                  <th key={f.key} className="py-3 px-2 font-medium">{f.label}</th>
                ))}
                <th className="py-3 px-2 w-24">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={99} className="py-10 text-center text-gray-400">جاري التحميل…</td></tr>}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={99} className="py-10 text-center text-gray-400">لا توجد بيانات</td></tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                  {visibleFields.map((f) => (
                    <td key={f.key} className="py-3 px-2">
                      {f.format ? f.format(r[f.key], r) : renderCell(r[f.key], f)}
                    </td>
                  ))}
                  <td className="py-3 px-2">
                    <button onClick={() => startEdit(r)} className="text-emerald-600 hover:text-emerald-700 text-sm ml-2">تعديل</button>
                    <button onClick={() => remove(r)} className="text-red-600 hover:text-red-700 text-sm">حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto scroll-thin" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-lg">{editing ? "تعديل" : "إضافة جديد"}</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {fields.filter((f) => !f.hideInForm).map((f) => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {f.label} {f.required && <span className="text-red-500">*</span>}
                  </label>
                  {renderInput(f, form, setForm)}
                </div>
              ))}
              {err && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{err}</div>}
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="px-5 py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">إلغاء</button>
              <button onClick={save} className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold">حفظ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function renderCell(v: any, f: Field) {
  if (v == null || v === "") return <span className="text-gray-300">—</span>;
  if (f.type === "boolean") return v ? <span className="text-emerald-600">✓</span> : <span className="text-gray-300">✗</span>;
  if (f.type === "date" || f.key.endsWith("_at")) {
    try { return <span className="text-gray-600 text-xs">{new Date(v).toLocaleString("ar-SA")}</span>; } catch { return String(v); }
  }
  if (typeof v === "object") return <span className="text-xs text-gray-500 font-mono">{JSON.stringify(v).slice(0, 40)}</span>;
  const s = String(v);
  return s.length > 50 ? s.slice(0, 50) + "…" : s;
}

function renderInput(f: Field, form: any, setForm: (v: any) => void) {
  const val = form[f.key] ?? "";
  const cls = "w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none";
  if (f.type === "textarea")
    return <textarea rows={4} value={val} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className={cls} placeholder={f.placeholder} />;
  if (f.type === "select")
    return (
      <select value={val} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className={cls}>
        <option value="">اختر…</option>
        {f.options?.map((o) => <option key={String(o.value)} value={o.value}>{o.label}</option>)}
      </select>
    );
  if (f.type === "boolean")
    return (
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={!!val} onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })} className="w-5 h-5 accent-emerald-600" />
        <span className="text-sm text-gray-700">مفعل</span>
      </label>
    );
  if (f.type === "number")
    return <input type="number" value={val} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className={cls} placeholder={f.placeholder} />;
  return <input type="text" value={val} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className={cls} placeholder={f.placeholder} />;
}
