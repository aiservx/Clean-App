import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

// ── Segment definitions ───────────────────────────────────────────────────────
type Segment = "all" | "inactive_14d" | "inactive_30d" | "recent_7d" | "vip";

const SEGMENTS: { id: Segment; label: string; icon: string; desc: string; color: string }[] = [
  { id: "all",         label: "جميع المستخدمين",   icon: "👥", desc: "كل المستخدمين المسجلين",        color: "#3B82F6" },
  { id: "inactive_14d",label: "خاملون +14 يوم",    icon: "😴", desc: "آخر حجز أكثر من 14 يوم",        color: "#F59E0B" },
  { id: "inactive_30d",label: "خاملون +30 يوم",    icon: "🌙", desc: "آخر حجز أكثر من 30 يوم",        color: "#EF4444" },
  { id: "recent_7d",  label: "حجزوا مؤخراً",       icon: "⚡", desc: "حجزوا خلال آخر 7 أيام",         color: "#16C47F" },
  { id: "vip",        label: "VIP (3+ طلبات)",     icon: "💎", desc: "عملاء أكثر من 3 طلبات مكتملة",  color: "#8B5CF6" },
];

const NOTIF_TYPES = [
  { id: "promotion",      label: "🎁 عرض خاص" },
  { id: "re_engagement",  label: "🔔 إعادة استقطاب" },
  { id: "announcement",   label: "📢 إعلان" },
  { id: "service_update", label: "🧹 تحديث خدمة" },
];

type Campaign = {
  id: string;
  segment: string;
  title: string;
  body: string;
  sentAt: string;
  sent: number;
  total: number;
};

export default function Campaigns() {
  const [segment, setSegment] = useState<Segment>("inactive_14d");
  const [notifType, setNotifType] = useState("re_engagement");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetCount, setTargetCount] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [countLoading, setCountLoading] = useState(false);
  const [result, setResult] = useState<{ sent: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Campaign[]>(() => {
    try { return JSON.parse(localStorage.getItem("nazafa_campaigns") || "[]"); }
    catch { return []; }
  });

  // ── Quick fill templates ─────────────────────────────────────────────────
  const TEMPLATES: Record<Segment, { title: string; body: string }> = {
    all:          { title: "🧹 خدمات نظافة احترافية", body: "استمتع بمنزل نظيف ومريح — احجز الآن واحصل على خدمة مميزة 🌟" },
    inactive_14d: { title: "🏠 منزلك يحتاجك!", body: "مضى وقت على آخر تنظيف — احجز اليوم واحصل على خصم 15% 🎁" },
    inactive_30d: { title: "😮 عدنا بعرض لا يُرفض!", body: "نفتقدك في نظافة! احجز تنظيفاً شاملاً اليوم واحصل على خصم 25% ⚡" },
    recent_7d:    { title: "⭐ هل أعجبك الخدمة؟", body: "شكراً لاختيارك نظافة! قيّم تجربتك وشارك صديقاً واكسب 20 ريال 💰" },
    vip:          { title: "💎 أنت من VIP نظافة!", body: "شكراً لولائك! استمتع بخصم حصري 30% على حجزك القادم — لأعضاء VIP فقط" },
  };

  const applyTemplate = () => {
    const t = TEMPLATES[segment];
    setTitle(t.title); setBody(t.body);
  };

  // ── Count target users ────────────────────────────────────────────────────
  const countTargetUsers = useCallback(async () => {
    setCountLoading(true);
    try {
      if (segment === "all") {
        const { count } = await supabase
          .from("profiles").select("id", { count: "exact", head: true }).eq("role", "user");
        setTargetCount(count ?? 0);
        return;
      }
      if (segment === "inactive_14d" || segment === "inactive_30d") {
        const days = segment === "inactive_14d" ? 14 : 30;
        const cutoff = new Date(Date.now() - days * 86400000).toISOString();
        // Users who either never booked or last booked before cutoff
        const { data: activeUsers } = await supabase
          .from("bookings").select("user_id")
          .gte("created_at", cutoff)
          .not("user_id", "is", null);
        const activeIds = new Set((activeUsers || []).map((b: any) => b.user_id));
        const { count: total } = await supabase
          .from("profiles").select("id", { count: "exact", head: true }).eq("role", "user");
        setTargetCount(Math.max(0, (total ?? 0) - activeIds.size));
        return;
      }
      if (segment === "recent_7d") {
        const since = new Date(Date.now() - 7 * 86400000).toISOString();
        const { data } = await supabase.from("bookings").select("user_id").gte("created_at", since).not("user_id", "is", null);
        const unique = new Set((data || []).map((b: any) => b.user_id));
        setTargetCount(unique.size);
        return;
      }
      if (segment === "vip") {
        const { data } = await supabase.from("bookings").select("user_id").eq("status", "completed").not("user_id", "is", null);
        const counts: Record<string, number> = {};
        (data || []).forEach((b: any) => { counts[b.user_id] = (counts[b.user_id] || 0) + 1; });
        setTargetCount(Object.values(counts).filter((c) => c >= 3).length);
        return;
      }
    } catch { setTargetCount(null); }
    finally { setCountLoading(false); }
  }, [segment]);

  useEffect(() => { countTargetUsers(); }, [countTargetUsers]);

  // ── Fetch target user IDs ─────────────────────────────────────────────────
  const fetchTargetIds = async (): Promise<string[]> => {
    if (segment === "all") {
      const { data } = await supabase.from("profiles").select("id").eq("role", "user");
      return (data || []).map((u: any) => u.id);
    }
    if (segment === "inactive_14d" || segment === "inactive_30d") {
      const days = segment === "inactive_14d" ? 14 : 30;
      const cutoff = new Date(Date.now() - days * 86400000).toISOString();
      const [{ data: allUsers }, { data: activeBookings }] = await Promise.all([
        supabase.from("profiles").select("id").eq("role", "user"),
        supabase.from("bookings").select("user_id").gte("created_at", cutoff).not("user_id", "is", null),
      ]);
      const activeIds = new Set((activeBookings || []).map((b: any) => b.user_id));
      return (allUsers || []).map((u: any) => u.id).filter((id: string) => !activeIds.has(id));
    }
    if (segment === "recent_7d") {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data } = await supabase.from("bookings").select("user_id").gte("created_at", since).not("user_id", "is", null);
      return [...new Set((data || []).map((b: any) => b.user_id))];
    }
    if (segment === "vip") {
      const { data } = await supabase.from("bookings").select("user_id").eq("status", "completed").not("user_id", "is", null);
      const counts: Record<string, number> = {};
      (data || []).forEach((b: any) => { counts[b.user_id] = (counts[b.user_id] || 0) + 1; });
      return Object.entries(counts).filter(([, c]) => c >= 3).map(([id]) => id);
    }
    return [];
  };

  // ── Send campaign ─────────────────────────────────────────────────────────
  const sendCampaign = async () => {
    if (!title.trim() || !body.trim()) { setError("أدخل عنوان ونص الإشعار"); return; }
    setSending(true); setError(null); setResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setError("يجب تسجيل الدخول أولاً"); return; }

      const userIds = await fetchTargetIds();
      if (!userIds.length) { setError("لا يوجد مستخدمون في هذه الشريحة"); setSending(false); return; }

      // Send in chunks of 100 to avoid timeouts
      const CHUNK = 100;
      let totalSent = 0;
      for (let i = 0; i < userIds.length; i += CHUNK) {
        const chunk = userIds.slice(i, i + CHUNK);
        const res = await fetch("/api/push/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ userIds: chunk, title: title.trim(), body: body.trim(), categoryIdentifier: notifType }),
        });
        if (res.ok) { const j = await res.json(); totalSent += j.sent ?? 0; }
      }

      const camp: Campaign = {
        id: Date.now().toString(),
        segment: SEGMENTS.find((s) => s.id === segment)?.label ?? segment,
        title: title.trim(), body: body.trim(),
        sentAt: new Date().toLocaleString("ar-SA"),
        sent: totalSent, total: userIds.length,
      };
      const updated = [camp, ...history].slice(0, 20);
      setHistory(updated);
      localStorage.setItem("nazafa_campaigns", JSON.stringify(updated));
      setResult({ sent: totalSent, total: userIds.length });
    } catch (e: any) {
      setError(e.message || "حدث خطأ أثناء الإرسال");
    } finally { setSending(false); }
  };

  const seg = SEGMENTS.find((s) => s.id === segment)!;

  return (
    <div dir="rtl" className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📣 مدير الحملات التسويقية</h1>
        <p className="text-gray-500 mt-1">أرسل إشعارات مستهدفة لشرائح محددة من مستخدميك</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT — Compose */}
        <div className="lg:col-span-2 space-y-4">
          {/* Segment selector */}
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <h2 className="font-bold text-gray-800 mb-4">🎯 اختر الشريحة المستهدفة</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {SEGMENTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSegment(s.id)}
                  className="rounded-xl p-3 text-right border-2 transition-all"
                  style={{
                    borderColor: segment === s.id ? s.color : "#E2E8F0",
                    background: segment === s.id ? s.color + "12" : "#FAFAFA",
                  }}
                >
                  <div className="text-xl mb-1">{s.icon}</div>
                  <div className="font-bold text-gray-900 text-sm">{s.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Notification type */}
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <h2 className="font-bold text-gray-800 mb-3">📋 نوع الإشعار</h2>
            <div className="flex flex-wrap gap-2">
              {NOTIF_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setNotifType(t.id)}
                  className="px-4 py-2 rounded-full text-sm font-bold border-2 transition-all"
                  style={{
                    borderColor: notifType === t.id ? "#16C47F" : "#E2E8F0",
                    background: notifType === t.id ? "#DCFCE7" : "#FAFAFA",
                    color: notifType === t.id ? "#15803D" : "#374151",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Message composer */}
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800">✏️ محتوى الإشعار</h2>
              <button
                onClick={applyTemplate}
                className="text-xs px-3 py-1.5 rounded-full font-bold"
                style={{ background: "#EDE9FE", color: "#7C3AED" }}
              >
                ✨ قالب جاهز
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">العنوان</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={60}
                  placeholder="مثال: عرض خاص لعملائنا المميزين 🎁"
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-green-400 transition-all"
                  style={{ fontFamily: "Tajawal, sans-serif", direction: "rtl" }}
                />
                <div className="text-xs text-gray-400 mt-1 text-left">{title.length}/60</div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">نص الرسالة</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={160}
                  rows={3}
                  placeholder="مثال: استمتع بخصم 15% على حجزك القادم — لفترة محدودة فقط..."
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-green-400 transition-all resize-none"
                  style={{ fontFamily: "Tajawal, sans-serif", direction: "rtl" }}
                />
                <div className="text-xs text-gray-400 mt-1 text-left">{body.length}/160</div>
              </div>
            </div>
          </div>

          {/* Send button */}
          <div className="flex items-center gap-3">
            <button
              onClick={sendCampaign}
              disabled={sending || !title.trim() || !body.trim()}
              className="flex-1 py-3 rounded-xl font-bold text-white text-base transition-all disabled:opacity-50"
              style={{ background: sending ? "#94A3B8" : "linear-gradient(135deg, #16C47F, #0FA868)", fontFamily: "Tajawal, sans-serif" }}
            >
              {sending ? "⏳ جاري الإرسال..." : `🚀 إرسال الحملة${targetCount ? ` (${targetCount.toLocaleString("ar-SA")} مستخدم)` : ""}`}
            </button>
          </div>

          {/* Result/Error feedback */}
          {result && (
            <div className="rounded-xl p-4" style={{ background: "#DCFCE7", border: "2px solid #86EFAC" }}>
              <p className="font-bold text-green-800">✅ تم الإرسال بنجاح!</p>
              <p className="text-green-700 text-sm mt-1">
                أُرسل الإشعار إلى <strong>{result.sent.toLocaleString("ar-SA")}</strong> جهاز من أصل{" "}
                <strong>{result.total.toLocaleString("ar-SA")}</strong> مستهدف
              </p>
            </div>
          )}
          {error && (
            <div className="rounded-xl p-4" style={{ background: "#FEE2E2", border: "2px solid #FCA5A5" }}>
              <p className="font-bold text-red-800">⚠️ خطأ</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          )}
        </div>

        {/* RIGHT — Preview + Stats */}
        <div className="space-y-4">
          {/* Live preview */}
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <h2 className="font-bold text-gray-800 mb-3">📱 معاينة الإشعار</h2>
            <div className="rounded-2xl p-4" style={{ background: "#1C1C1E" }}>
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{ background: "linear-gradient(135deg, #16C47F, #0FA868)" }}>ن</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span style={{ color: "#E2E8F0", fontSize: 12, fontFamily: "Tajawal, sans-serif", fontWeight: 700 }}>نظافة</span>
                    <span style={{ color: "#94A3B8", fontSize: 10 }}>الآن</span>
                  </div>
                  <div style={{ color: "#F1F5F9", fontSize: 13, fontFamily: "Tajawal, sans-serif", fontWeight: 700, marginTop: 2 }}>
                    {title || "عنوان الإشعار سيظهر هنا"}
                  </div>
                  <div style={{ color: "#94A3B8", fontSize: 12, fontFamily: "Tajawal, sans-serif", marginTop: 2, lineHeight: 1.4 }}>
                    {body || "نص الرسالة سيظهر هنا..."}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Target stats */}
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <h2 className="font-bold text-gray-800 mb-3">📊 إحصائيات الحملة</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl p-3" style={{ background: seg.color + "10" }}>
                <span className="text-sm font-bold text-gray-700">المستهدفون</span>
                <span className="font-bold text-lg" style={{ color: seg.color }}>
                  {countLoading ? "..." : (targetCount ?? "—").toLocaleString("ar-SA")}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl p-3" style={{ background: "#F8FAFC" }}>
                <span className="text-sm text-gray-600">الشريحة</span>
                <span className="text-sm font-bold text-gray-800">{seg.icon} {seg.label}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl p-3" style={{ background: "#F8FAFC" }}>
                <span className="text-sm text-gray-600">نوع الإشعار</span>
                <span className="text-sm font-bold text-gray-800">{NOTIF_TYPES.find((t) => t.id === notifType)?.label}</span>
              </div>
            </div>
          </div>

          {/* Recent campaigns */}
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <h2 className="font-bold text-gray-800 mb-3">📝 آخر الحملات</h2>
            {history.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">لا توجد حملات مُرسلة بعد</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {history.map((c) => (
                  <div key={c.id} className="rounded-xl p-3" style={{ background: "#F8FAFC" }}>
                    <div className="font-bold text-gray-900 text-sm truncate">{c.title}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">{c.segment}</span>
                      <span className="text-xs font-bold text-green-700">{c.sent}/{c.total} ✓</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{c.sentAt}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
