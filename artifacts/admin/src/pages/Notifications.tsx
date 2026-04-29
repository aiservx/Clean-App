import { useState } from "react";
import { Card, PageHeader } from "@/components/Layout";
import { supabase } from "@/lib/supabase";

export default function Notifications() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState("all");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function send() {
    setLoading(true);
    let q = supabase.from("profiles").select("id");
    if (target === "users") q = q.eq("role", "user");
    if (target === "providers") q = q.eq("role", "provider");
    const { data: users } = await q;
    if (users) {
      await supabase.from("notifications").insert(
        users.map((u: any) => ({ user_id: u.id, title, body }))
      );
    }
    setSent(true);
    setLoading(false);
    setTimeout(() => setSent(false), 3000);
  }

  return (
    <div className="p-8 max-w-3xl">
      <PageHeader title="إرسال إشعار" subtitle="أرسل إشعارًا لشريحة معينة من المستخدمين" />
      <Card className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">الفئة المستهدفة</label>
          <select value={target} onChange={(e) => setTarget(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-200">
            <option value="all">الجميع</option>
            <option value="users">العملاء فقط</option>
            <option value="providers">مقدمو الخدمة فقط</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">عنوان الإشعار</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-200" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">المحتوى</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className="w-full px-4 py-2.5 rounded-lg border border-gray-200" />
        </div>
        <button
          disabled={!title || !body || loading}
          onClick={send}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold disabled:opacity-50"
        >
          {loading ? "جاري الإرسال…" : "إرسال الإشعار"}
        </button>
        {sent && <div className="text-center text-emerald-600 text-sm">تم الإرسال بنجاح ✓</div>}
      </Card>
    </div>
  );
}
