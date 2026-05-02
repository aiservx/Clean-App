import { useEffect, useState, ReactNode } from "react";
import { Card, PageHeader, StatusChip } from "./Layout";
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
    const q = supabase.from(table).select(selectQuery ?? "*").order(orderBy, { ascending });
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
    let payload: Record<string, any> = {};
    fields.filter((f) => !f.hideInForm).forEach((f) => {
      let v = form[f.key];
      if (v === undefined || v === null) return;
      if (f.type === "number" && v !== "") v = Number(v);
      if (f.type === "boolean") v = !!v;
      if (typeof v === "object" && !Array.isArray(v)) return;
      payload[f.key] = v;
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

  const inputCls =
    "w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 outline-none text-sm"
  ;
  const focusColor = "focus:ring-green-400";

  return (
    <div className="p-6">
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={
          <button
            onClick={startNew}
            className="px-5 py-2.5 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #16C47F, #0FA868)", fontFamily: "Tajawal, sans-serif" }}
          >
            + إضافة جديد
          </button>
        }
      />

      <Card className="overflow-hidden p-0">
        {/* Search bar */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث..."
            className={`w-72 px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none ${focusColor} focus:ring-2`}
            style={{ fontFamily: "Tajawal, sans-serif" }}
          />
          <span style={{ fontSize: 12, color: "#94A3B8" }}>{filtered.length} عنصر</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                {visibleFields.map((f) => (
                  <th key={f.key} className="py-3 px-4 font-bold" style={{ color: "#94A3B8", fontSize: 11, fontFamily: "Tajawal, sans-serif" }}>
                    {f.label}
                  </th>
                ))}
                <th className="py-3 px-4 font-bold w-28" style={{ color: "#94A3B8", fontSize: 11 }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={99} className="py-12 text-center" style={{ color: "#94A3B8" }}>جاري التحميل…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={99} className="py-12 text-center" style={{ color: "#94A3B8" }}>لا توجد بيانات</td></tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                  {visibleFields.map((f) => (
                    <td key={f.key} className="py-3 px-4">
                      {f.key === "status"
                        ? <StatusChip status={r[f.key]} />
                        : f.format
                        ? f.format(r[f.key], r)
                        : renderCell(r[f.key], f)}
                    </td>
                  ))}
                  <td className="py-3 px-4">
                    <button
                      onClick={() => startEdit(r)}
                      className="text-sm font-bold ml-3 transition-opacity hover:opacity-70"
                      style={{ color: "var(--color-primary)", fontFamily: "Tajawal, sans-serif" }}
                    >
                      تعديل
                    </button>
                    <button
                      onClick={() => remove(r)}
                      className="text-sm font-bold transition-opacity hover:opacity-70"
                      style={{ color: "var(--color-danger)", fontFamily: "Tajawal, sans-serif" }}
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Modal ── */}
      {open && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          style={{ background: "rgba(15,23,42,0.55)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto scroll-thin"
            style={{ background: "#fff", borderRadius: 24, boxShadow: "var(--shadow-modal)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
              <h2 className="font-bold" style={{ fontSize: 17, fontFamily: "Tajawal, sans-serif" }}>
                {editing ? "تعديل" : "إضافة جديد"}
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors"
                style={{ fontSize: 18, color: "#94A3B8" }}
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {fields.filter((f) => !f.hideInForm).map((f) => (
                <div key={f.key}>
                  <label className="block font-bold mb-1.5" style={{ fontSize: 13, color: "#374151", fontFamily: "Tajawal, sans-serif" }}>
                    {f.label} {f.required && <span style={{ color: "var(--color-danger)" }}>*</span>}
                  </label>
                  {renderInput(f, form, setForm, inputCls + " " + focusColor)}
                </div>
              ))}
              {err && (
                <div className="text-sm p-3 rounded-xl" style={{ color: "var(--color-danger)", background: "#FEE2E2" }}>{err}</div>
              )}
            </div>

            <div className="flex justify-end gap-2 p-6" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
              <button
                onClick={() => setOpen(false)}
                className="px-5 py-2.5 rounded-xl border font-bold text-sm transition-colors hover:bg-gray-50"
                style={{ borderColor: "#E2E8F0", color: "#374151", fontFamily: "Tajawal, sans-serif" }}
              >
                إلغاء
              </button>
              <button
                onClick={save}
                className="px-6 py-2.5 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #16C47F, #0FA868)", fontFamily: "Tajawal, sans-serif" }}
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function renderCell(v: any, f: Field) {
  if (v == null || v === "") return <span style={{ color: "#CBD5E1" }}>—</span>;
  if (f.type === "boolean") return v
    ? <span style={{ color: "var(--color-primary)", fontWeight: 700 }}>✓</span>
    : <span style={{ color: "#CBD5E1" }}>✗</span>;
  if (f.type === "date" || f.key.endsWith("_at")) {
    try {
      return <span style={{ color: "#64748B", fontSize: 12 }}>{new Date(v).toLocaleString("ar-SA")}</span>;
    } catch { return String(v); }
  }
  if (typeof v === "object") {
    return <span style={{ fontSize: 11, color: "#94A3B8", fontFamily: "monospace" }}>{JSON.stringify(v).slice(0, 40)}</span>;
  }
  const s = String(v);
  return s.length > 60 ? s.slice(0, 60) + "…" : s;
}

function renderInput(f: Field, form: any, setForm: (v: any) => void, cls: string) {
  const val = form[f.key] ?? "";
  if (f.type === "textarea")
    return (
      <textarea
        rows={4}
        value={val}
        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
        className={cls}
        placeholder={f.placeholder}
        style={{ resize: "vertical", fontFamily: "Tajawal, sans-serif" }}
      />
    );
  if (f.type === "select")
    return (
      <select
        value={val}
        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
        className={cls}
        style={{ fontFamily: "Tajawal, sans-serif" }}
      >
        <option value="">اختر…</option>
        {f.options?.map((o) => <option key={String(o.value)} value={o.value}>{o.label}</option>)}
      </select>
    );
  if (f.type === "boolean")
    return (
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={!!val}
          onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })}
          className="w-5 h-5"
          style={{ accentColor: "var(--color-primary)" }}
        />
        <span style={{ fontSize: 13, color: "#374151", fontFamily: "Tajawal, sans-serif" }}>مفعل</span>
      </label>
    );
  if (f.type === "number")
    return <input type="number" value={val} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className={cls} placeholder={f.placeholder} />;
  return <input type="text" value={val} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className={cls} placeholder={f.placeholder} style={{ fontFamily: "Tajawal, sans-serif" }} />;
}
