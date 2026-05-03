import { useState } from "react";
import { Card, PageHeader } from "@/components/Layout";
import { supabase } from "@/lib/supabase";

const API_BASE = import.meta.env.VITE_API_URL || "https://eb9ca67f-3840-494c-a44c-7f4dce377432-00-ssajzbo1u1yq.kirk.replit.dev";

export default function Notifications() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState("all");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pushCount, setPushCount] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function send() {
    setLoading(true);
    setPushCount(null);
    setErr(null);
    try {
      let q = supabase.from("profiles").select("id");
      if (target === "users") q = q.eq("role", "user");
      if (target === "providers") q = q.eq("role", "provider");
      const { data: users } = await q;
      if (!users?.length) { setSent(true); return; }

      const userIds = users.map((u: any) => u.id);

      // 1. Save in-app notifications
      await supabase.from("notifications").insert(
        userIds.map((id: string) => ({ user_id: id, title, body, type: "admin_broadcast", read: false }))
      );

      // 2. Send push via API server (uses service role key to bypass RLS)
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) { setErr("لا توجد جلسة تسجيل دخول"); return; }

      const res = await fetch(`${API_BASE}/api/push/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          userIds,
          title,
          body,
          data: { type: "admin_broadcast" },
          channelId: "default",
        }),
      });

      const json = await res.json().catch(() => null);
      setPushCount(json?.sent ?? 0);
      setSent(true);
      setTimeout(() => setSent(false), 4000);
    } catch (e: any) {
      setErr(e?.message ?? "حدث خطأ");
    } finally {
      setLoading(false);
    }
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
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-200" placeholder="مثال: عرض خاص اليوم فقط!" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">المحتوى</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className="w-full px-4 py-2.5 rounded-lg border border-gray-200" placeholder="اكتب محتوى الإشعار هنا..." />
        </div>
        <button
          disabled={!title || !body || loading}
          onClick={send}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold disabled:opacity-50"
        >
          {loading ? "جاري الإرسال…" : "إرسال الإشعار"}
        </button>
        {err && (
          <div className="text-center text-red-600 text-sm p-3 bg-red-50 rounded-xl">{err}</div>
        )}
        {sent && (
          <div className="text-center text-emerald-600 text-sm">
            تم الإرسال بنجاح ✓
            {pushCount !== null && (
              <span className="block text-xs text-gray-500 mt-1">
                وصل كـ Push لـ {pushCount} جهاز
              </span>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
