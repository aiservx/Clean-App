/**
 * Smart Notifications Center — Templates, History, Rich Targeting
 */
import { useState, useEffect, useCallback } from "react";
import { Card, PageHeader } from "@/components/Layout";
import { supabase } from "@/lib/supabase";

const API_BASE = import.meta.env.VITE_API_URL ||
  `https://${window.location.hostname.replace(/^\d+-/, "8080-")}`;

// ── Templates ─────────────────────────────────────────────────────────────────
const TEMPLATES: { icon: string; label: string; title: string; body: string; target: string }[] = [
  { icon: "🎉", label: "ترحيب بعميل جديد",  title: "مرحباً بك في نظافة! 🌟",    body: "شكراً لانضمامك. استمتع بأول تنظيف بخصم 20% مع الكود: WELCOME20",       target: "users" },
  { icon: "🌙", label: "عرض رمضان",          title: "عروض رمضان الكريم ✨",       body: "خصم 30% على جميع خدمات التنظيف طوال شهر رمضان المبارك. احجز الآن!",   target: "users" },
  { icon: "🎊", label: "عرض نهاية الأسبوع", title: "عرض خاص 🔥 هذا الأسبوع",    body: "خصم 25% على التنظيف العميق يوم الجمعة والسبت فقط. احجز قبل نفاد الأماكن!", target: "users" },
  { icon: "⭐", label: "طلب تقييم",          title: "قيّم تجربتك معنا ⭐",        body: "كيف كانت تجربتك مع مزود الخدمة؟ تقييمك يساعدنا على تحسين الجودة.",    target: "users" },
  { icon: "🆕", label: "خدمة جديدة",         title: "أطلقنا خدمة التنظيف الصناعي 🏭", body: "خدمة جديدة! تنظيف متخصص للمصانع والمستودعات. تعرّف أكثر في التطبيق.", target: "all" },
  { icon: "👷", label: "تحديث للمزودين",     title: "تحديث مهم لمزودي الخدمة 📢", body: "تم تحديث سياسة العمولة. افتح التطبيق للاطلاع على التفاصيل الجديدة.",   target: "providers" },
  { icon: "🏆", label: "مبروك للمزود",       title: "مبروك! أنت من أفضل المزودين 🏆", body: "وصلت لـ 100 طلب مكتمل! شكراً على احترافيتك وجهودك المتميزة.",      target: "providers" },
  { icon: "🔔", label: "تذكير بموعد",        title: "تذكير: لديك موعد غداً 📅",   body: "لديك حجز تنظيف غداً الساعة 10 صباحاً. استعد لاستقبال مزود الخدمة!",  target: "users" },
];

type HistoryItem = { id: string; title: string; body: string; type: string; created_at: string; read: boolean };

// ── Phone preview ────────────────────────────────────────────────────────────
function PhonePreview({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ width: 260, background: "#1C1C1E", borderRadius: 24, padding: "20px 16px", fontFamily: "Tajawal, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: "#16C47F", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#FFF" }}>ن</div>
        <span style={{ color: "#FFFFFF99", fontSize: 11 }}>نظافة</span>
        <span style={{ color: "#FFFFFF40", fontSize: 10, marginRight: "auto" }}>الآن</span>
      </div>
      <div style={{ background: "#2C2C2E", borderRadius: 14, padding: "12px 14px" }}>
        <div style={{ color: "#FFF", fontWeight: 700, fontSize: 13, marginBottom: 4, lineHeight: 1.4, direction: "rtl" }}>
          {title || "عنوان الإشعار"}
        </div>
        <div style={{ color: "#FFFFFFB3", fontSize: 11, lineHeight: 1.5, direction: "rtl" }}>
          {body || "محتوى الإشعار سيظهر هنا…"}
        </div>
      </div>
    </div>
  );
}

// ── History row ───────────────────────────────────────────────────────────────
function HistoryRow({ item }: { item: HistoryItem }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 16 }}>
        📣
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", fontFamily: "Tajawal, sans-serif" }}>{item.title}</div>
        <div style={{ fontSize: 12, color: "#64748B", marginTop: 2, fontFamily: "Tajawal, sans-serif" }}>{item.body}</div>
      </div>
      <div style={{ fontSize: 11, color: "#94A3B8", whiteSpace: "nowrap", fontFamily: "Tajawal, sans-serif" }}>
        {new Date(item.created_at).toLocaleString("ar-SA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
      </div>
    </div>
  );
}

export default function Notifications() {
  const [title, setTitle]     = useState("");
  const [body, setBody]       = useState("");
  const [target, setTarget]   = useState("all");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [pushCount, setPushCount] = useState<number | null>(null);
  const [err, setErr]         = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [tab, setTab]         = useState<"compose"|"history">("compose");
  const [histLoading, setHistLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setHistLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("id, title, body, type, created_at, read")
      .eq("type", "admin_broadcast")
      .order("created_at", { ascending: false })
      .limit(50);
    setHistory(data ?? []);
    setHistLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "history") loadHistory();
  }, [tab, loadHistory]);

  function applyTemplate(t: typeof TEMPLATES[0]) {
    setTitle(t.title);
    setBody(t.body);
    setTarget(t.target);
    setTab("compose");
  }

  async function send() {
    setLoading(true);
    setPushCount(null);
    setErr(null);
    try {
      let q = supabase.from("profiles").select("id");
      if (target === "users")     q = q.eq("role", "user");
      if (target === "providers") q = q.eq("role", "provider");
      const { data: users } = await q;
      if (!users?.length) { setSent(true); setLoading(false); return; }

      const userIds = users.map((u: any) => u.id);

      await supabase.from("notifications").insert(
        userIds.map((id: string) => ({ user_id: id, title, body, type: "admin_broadcast", read: false }))
      );

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (accessToken) {
        const res = await fetch(`${API_BASE}/api/push/batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ userIds, title, body, data: { type: "admin_broadcast" }, channelId: "default" }),
        });
        const json = await res.json().catch(() => null);
        setPushCount(json?.sent ?? 0);
      }

      setSent(true);
      setTimeout(() => { setSent(false); setTitle(""); setBody(""); }, 3500);
    } catch (e: any) {
      setErr(e?.message ?? "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  const targetLabel = target === "all" ? "الجميع" : target === "users" ? "العملاء فقط" : "مقدمو الخدمة";

  return (
    <div className="p-6" dir="rtl">
      <PageHeader
        title="🔔 مركز الإشعارات"
        subtitle="إرسال إشعارات ذكية مع قوالب جاهزة ومعاينة فورية"
      />

      {/* ── Templates grid ── */}
      <Card className="p-5 mb-4">
        <h3 className="font-bold text-gray-900 mb-3" style={{ fontFamily: "Tajawal, sans-serif", fontSize: 14 }}>
          ⚡ قوالب جاهزة — انقر لتطبيق
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.label}
              onClick={() => applyTemplate(t)}
              style={{
                padding: "10px 12px", borderRadius: 12, border: "1px solid #E2E8F0",
                background: "#F8FAFC", cursor: "pointer", textAlign: "right",
                transition: "all 0.15s", fontFamily: "Tajawal, sans-serif",
              }}
              className="hover:border-emerald-400 hover:bg-emerald-50 transition-all"
            >
              <div style={{ fontSize: 18, marginBottom: 4 }}>{t.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 2 }}>{t.label}</div>
              <div style={{ fontSize: 10, color: "#94A3B8" }}>
                {t.target === "all" ? "الجميع" : t.target === "users" ? "للعملاء" : "للمزودين"}
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* ── Tab bar ── */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {[
          { key: "compose", label: "✏️ إنشاء إشعار" },
          { key: "history", label: "📋 سجل الإرسال" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            style={{
              padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer",
              fontFamily: "Tajawal, sans-serif", fontSize: 13, fontWeight: tab === t.key ? 700 : 500,
              background: tab === t.key ? "#16C47F" : "#F1F5F9",
              color: tab === t.key ? "#FFF" : "#374151",
              transition: "all 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "compose" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ── Form ── */}
          <Card className="p-6 lg:col-span-2 space-y-4">
            {/* Target */}
            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ fontFamily: "Tajawal, sans-serif", color: "#374151" }}>
                الفئة المستهدفة
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                {[
                  { value: "all", label: "🌍 الجميع" },
                  { value: "users", label: "👥 العملاء" },
                  { value: "providers", label: "👷 المزودون" },
                ].map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setTarget(o.value)}
                    style={{
                      flex: 1, padding: "9px 0", borderRadius: 10, border: "none", cursor: "pointer",
                      fontFamily: "Tajawal, sans-serif", fontSize: 13, fontWeight: target === o.value ? 700 : 500,
                      background: target === o.value ? "#16C47F" : "#F1F5F9",
                      color: target === o.value ? "#FFF" : "#374151",
                      transition: "all 0.15s",
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ fontFamily: "Tajawal, sans-serif", color: "#374151" }}>
                عنوان الإشعار
                <span style={{ color: "#94A3B8", fontWeight: 400, marginRight: 6, fontSize: 11 }}>
                  ({title.length}/50 حرف)
                </span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={50}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-emerald-400"
                style={{ fontFamily: "Tajawal, sans-serif", fontSize: 14 }}
                placeholder="مثال: عرض خاص اليوم فقط! 🔥"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ fontFamily: "Tajawal, sans-serif", color: "#374151" }}>
                محتوى الإشعار
                <span style={{ color: "#94A3B8", fontWeight: 400, marginRight: 6, fontSize: 11 }}>
                  ({body.length}/120 حرف)
                </span>
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={120}
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-emerald-400 resize-none"
                style={{ fontFamily: "Tajawal, sans-serif", fontSize: 14 }}
                placeholder="اكتب محتوى الإشعار هنا…"
              />
            </div>

            {/* Send button */}
            <button
              disabled={!title.trim() || !body.trim() || loading}
              onClick={send}
              style={{
                width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
                cursor: !title || !body || loading ? "not-allowed" : "pointer",
                background: sent ? "#DCFCE7" : loading ? "#94A3B8" : "linear-gradient(135deg,#16C47F,#0FA868)",
                color: sent ? "#16C47F" : "#FFF",
                fontFamily: "Tajawal, sans-serif", fontSize: 15, fontWeight: 700,
                transition: "all 0.2s",
              }}
            >
              {loading ? "⏳ جاري الإرسال…" : sent ? "✅ تم الإرسال بنجاح!" : `📤 إرسال لـ ${targetLabel}`}
            </button>

            {sent && pushCount !== null && (
              <div style={{ textAlign: "center", fontSize: 12, color: "#64748B", fontFamily: "Tajawal, sans-serif" }}>
                وصل كـ Push لـ <strong>{pushCount}</strong> جهاز
              </div>
            )}
            {err && (
              <div style={{ background: "#FEE2E2", borderRadius: 10, padding: "10px 14px", color: "#DC2626", fontSize: 13, fontFamily: "Tajawal, sans-serif" }}>
                ⚠️ {err}
              </div>
            )}
          </Card>

          {/* ── Preview ── */}
          <div className="flex flex-col items-center gap-4">
            <Card className="p-5 w-full">
              <h4 className="font-bold text-gray-900 mb-4 text-sm" style={{ fontFamily: "Tajawal, sans-serif" }}>معاينة على الجهاز</h4>
              <div className="flex justify-center">
                <PhonePreview title={title} body={body} />
              </div>
            </Card>
            <Card className="p-4 w-full">
              <h4 className="font-bold text-sm text-gray-700 mb-2" style={{ fontFamily: "Tajawal, sans-serif" }}>تلميحات للكتابة</h4>
              <ul className="space-y-1.5 text-xs text-gray-500" style={{ fontFamily: "Tajawal, sans-serif" }}>
                <li>🎯 اجعل العنوان جذاباً وقصيراً (3-6 كلمات)</li>
                <li>⏰ أضف إحساساً بالإلحاح (اليوم، فقط 24 ساعة)</li>
                <li>💡 استخدم الإيموجي في البداية لجذب الانتباه</li>
                <li>📊 أفضل وقت للإرسال: 8-10 صباحاً أو 7-9 مساءً</li>
              </ul>
            </Card>
          </div>
        </div>
      )}

      {tab === "history" && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold" style={{ fontFamily: "Tajawal, sans-serif" }}>آخر 50 إشعار جماعي</h3>
            <button onClick={loadHistory} style={{ fontSize: 12, color: "#16C47F", fontFamily: "Tajawal, sans-serif", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
              🔄 تحديث
            </button>
          </div>
          {histLoading && <div style={{ color: "#94A3B8", textAlign: "center", padding: 24, fontFamily: "Tajawal, sans-serif" }}>جاري التحميل…</div>}
          {!histLoading && history.length === 0 && (
            <div style={{ color: "#94A3B8", textAlign: "center", padding: 40, fontFamily: "Tajawal, sans-serif" }}>لا توجد إشعارات مرسلة بعد</div>
          )}
          {history.map((item) => <HistoryRow key={item.id} item={item} />)}
        </Card>
      )}
    </div>
  );
}
