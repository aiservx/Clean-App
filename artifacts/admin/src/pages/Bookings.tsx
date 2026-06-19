import { useEffect, useState, useCallback, useRef } from "react";
import { Card, PageHeader, StatusChip } from "@/components/Layout";
import { supabase } from "@/lib/supabase";

// ── Constants ─────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || "";

const STATUS_FLOW = ["pending", "accepted", "on_the_way", "arrived", "started", "in_progress", "completed"] as const;
type BookingStatus = typeof STATUS_FLOW[number] | "cancelled" | "rejected";

const ALL_STATUSES: { value: BookingStatus; label: string }[] = [
  { value: "pending",     label: "⏳ قيد الانتظار" },
  { value: "accepted",    label: "✅ مقبول" },
  { value: "on_the_way",  label: "🚗 في الطريق" },
  { value: "arrived",     label: "📍 وصل للموقع" },
  { value: "started",     label: "🧹 بدأ العمل" },
  { value: "in_progress", label: "🔧 جاري التنفيذ" },
  { value: "completed",   label: "🏆 مكتمل" },
  { value: "cancelled",   label: "❌ ملغي" },
  { value: "rejected",    label: "🚫 مرفوض" },
];

const STATUS_AR: Record<string, string> = {
  pending:     "قيد الانتظار",
  accepted:    "تأكيد الطلب",
  on_the_way:  "المزود في الطريق",
  arrived:     "وصل للموقع",
  started:     "بدأ العمل",
  in_progress: "بدء تنفيذ الخدمة",
  completed:   "اكتملت الخدمة",
  cancelled:   "إلغاء الطلب",
  rejected:    "رفض الطلب",
};

const FLOW_AR: Record<string, string> = {
  pending:     "تم استلام الطلب",
  accepted:    "تأكيد المزود",
  on_the_way:  "المزود في الطريق إليك",
  arrived:     "المزود وصل للموقع",
  started:     "بدأ العمل",
  in_progress: "بدء تنفيذ الخدمة",
  completed:   "إنجاز الخدمة ✨",
  cancelled:   "تم إلغاء الطلب",
  rejected:    "تم رفض الطلب",
};

const FLOW_DOTS: Record<string, string> = {
  pending:     "#F59E0B",
  accepted:    "#3B82F6",
  on_the_way:  "#8B5CF6",
  arrived:     "#F59E0B",
  started:     "#8B5CF6",
  in_progress: "#2F80ED",
  completed:   "#16C47F",
  cancelled:   "#EF4444",
  rejected:    "#EF4444",
};

type Booking = {
  id: string; status: string; total: number; created_at: string;
  scheduled_at: string | null; payment_method: string | null; notes: string | null;
  user_id: string;
  profiles: { full_name: string; phone: string | null } | null;
  services: { title_ar: string } | null;
  provider_profile: { full_name: string } | null;
  addresses: { street: string | null; district: string | null; city: string | null; lat?: number; lng?: number } | null;
};
type LogRow = { id: string; status: string; note: string | null; created_at: string };

const fmtDate = (iso: string | null) => {
  if (!iso) return "موعد مرن";
  return new Date(iso).toLocaleString("ar-SA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

// ── Push notification ─────────────────────────────────────────────────────────
async function notifyUser(userId: string, status: BookingStatus, bookingId: string) {
  const NOTIF_MESSAGES: Record<string, { title: string; body: string }> = {
    accepted:    { title: "✅ تم قبول طلبك!", body: "المزود تأكد على طلبك وسيتوجه إليك قريباً" },
    on_the_way:  { title: "🚗 المزود في الطريق إليك", body: "استعد! مزود الخدمة متجه نحوك الآن" },
    in_progress: { title: "🧹 بدأت الخدمة", body: "مزود الخدمة وصل وبدأ العمل لديك" },
    completed:   { title: "✨ اكتملت الخدمة!", body: "تم إنجاز الخدمة بنجاح. كيف تقيّم الخدمة؟" },
    cancelled:   { title: "❌ تم إلغاء طلبك", body: "تم إلغاء هذا الطلب من لوحة الإدارة" },
    rejected:    { title: "🚫 تم رفض طلبك", body: "تم رفض هذا الطلب، يمكنك تقديم طلب جديد" },
  };
  const msg = NOTIF_MESSAGES[status] ?? { title: "نظافة — تحديث طلبك", body: STATUS_AR[status] ?? status };
  const TYPE_MAP: Record<string, string> = {
    accepted: "booking_accepted", on_the_way: "booking_on_way",
    in_progress: "booking_in_progress", completed: "booking_completed",
    cancelled: "booking_cancelled", rejected: "booking_rejected",
  };
  const notifType = TYPE_MAP[status] ?? "booking_status";
  try {
    await supabase.from("notifications").insert({
      user_id: userId, title: msg.title, body: msg.body, type: notifType,
      data: { booking_id: bookingId, status }, read: false,
    });
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) return;
    await fetch(`${API_BASE}/api/push`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        userId, title: msg.title, body: msg.body,
        data: { bookingId, status, type: notifType },
        categoryIdentifier: notifType, channelId: "booking_status",
      }),
    });
  } catch (e) { console.error("[admin] notify error", e); }
}

// ── CSV Export ────────────────────────────────────────────────────────────────
function exportCSV(bookings: Booking[], filename = "bookings.csv") {
  const headers = ["رقم الطلب", "العميل", "الهاتف", "الخدمة", "الموعد", "المبلغ", "الحالة", "تاريخ الطلب"];
  const rows = bookings.map((b) => [
    b.id.slice(0, 8).toUpperCase(),
    b.profiles?.full_name ?? "",
    b.profiles?.phone ?? "",
    b.services?.title_ar ?? "",
    b.scheduled_at ? new Date(b.scheduled_at).toLocaleString("ar-SA") : "مرن",
    b.total,
    STATUS_AR[b.status] ?? b.status,
    new Date(b.created_at).toLocaleString("ar-SA"),
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename;
  a.click(); URL.revokeObjectURL(url);
}

// ── Timeline ──────────────────────────────────────────────────────────────────
function BookingTimeline({ logs, currentStatus }: { logs: LogRow[]; currentStatus: string }) {
  const isTerminal = ["cancelled", "rejected"].includes(currentStatus);
  const steps = isTerminal
    ? [...STATUS_FLOW.slice(0, STATUS_FLOW.indexOf(currentStatus as any) + 1).filter(Boolean), currentStatus as any]
    : STATUS_FLOW;
  const currentIdx = STATUS_FLOW.indexOf(currentStatus as any);

  return (
    <div style={{ padding: "16px 0 8px" }}>
      {steps.map((step, i) => {
        const log = logs.find((l) => l.status === step);
        const done = isTerminal
          ? step === currentStatus || STATUS_FLOW.indexOf(step as any) < STATUS_FLOW.indexOf(currentStatus as any)
          : i <= currentIdx;
        const active = !isTerminal && i === currentIdx;
        const color = done ? FLOW_DOTS[step] : "#CBD5E1";
        return (
          <div key={step} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 4 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 24, flexShrink: 0 }}>
              <div style={{
                width: active ? 16 : 12, height: active ? 16 : 12, borderRadius: "50%", background: color,
                border: active ? `3px solid ${color}40` : "none", boxShadow: active ? `0 0 0 4px ${color}20` : "none",
                transition: "all 0.2s", flexShrink: 0,
              }} />
              {i < steps.length - 1 && (
                <div style={{ width: 2, flex: 1, minHeight: 24, background: done ? color : "#E2E8F0", marginTop: 3, marginBottom: 3 }} />
              )}
            </div>
            <div style={{ paddingBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: done ? "#0F172A" : "#94A3B8", fontFamily: "Tajawal, sans-serif" }}>
                {FLOW_AR[step] ?? step}
              </div>
              {log && (
                <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>
                  {new Date(log.created_at).toLocaleString("ar-SA", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
                  {log.note && ` · ${log.note}`}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Auto-Dispatch Result Modal ────────────────────────────────────────────────
function AutoDispatchModal({
  result, onConfirm, onClose,
}: { result: any; onConfirm: (providerId: string) => void; onClose: () => void }) {
  const provider = result?.suggestions?.[0];
  if (!provider) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{ background: "#FFF", borderRadius: 20, padding: 24, width: 340, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
        onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontFamily: "Tajawal, sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 16, color: "#0F172A" }}>
          🤖 أفضل مزود مقترح
        </h3>
        <div style={{ background: "#F8FAFC", borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, fontFamily: "Tajawal, sans-serif", color: "#0F172A", marginBottom: 6 }}>
            {provider.full_name}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { label: "التقييم", value: `⭐ ${Number(provider.rating).toFixed(1)}` },
              { label: "المهام المكتملة", value: provider.total_jobs },
              { label: "المسافة", value: provider.distance_km != null ? `${Number(provider.distance_km).toFixed(1)} كم` : "غير معروف" },
              { label: "نقاط الملاءمة", value: Math.round((provider.score ?? 0) * 100) + "٪" },
            ].map((s) => (
              <div key={s.label} style={{ background: "#FFF", borderRadius: 10, padding: "8px 12px" }}>
                <div style={{ fontSize: 11, color: "#94A3B8", fontFamily: "Tajawal, sans-serif" }}>{s.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", fontFamily: "Tajawal, sans-serif" }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => onConfirm(provider.id)}
            style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#16C47F,#0FA868)", color: "#FFF", fontFamily: "Tajawal, sans-serif", fontSize: 14, fontWeight: 700 }}
          >
            تعيين هذا المزود
          </button>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "none", cursor: "pointer", background: "#F1F5F9", color: "#374151", fontFamily: "Tajawal, sans-serif", fontSize: 14, fontWeight: 700 }}
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Booking Row ───────────────────────────────────────────────────────────────
function BookingRow({
  booking, onStatusChange, onAutoDispatch,
}: {
  booking: Booking;
  onStatusChange: (id: string, status: BookingStatus) => Promise<void>;
  onAutoDispatch: (booking: Booking) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [changing, setChanging] = useState(false);
  const [newStatus, setNewStatus] = useState<BookingStatus>(booking.status as BookingStatus);

  async function loadLogs() {
    const { data } = await supabase
      .from("booking_status_log").select("id, status, note, created_at")
      .eq("booking_id", booking.id).order("created_at", { ascending: true });
    setLogs(data ?? []);
  }

  function toggleExpand() {
    setExpanded((v) => !v);
    if (!expanded) loadLogs();
  }

  async function applyStatus() {
    if (newStatus === booking.status) return;
    setChanging(true);
    await onStatusChange(booking.id, newStatus);
    await loadLogs();
    setChanging(false);
  }

  const isPending = booking.status === "pending";

  return (
    <>
      <tr
        className="hover:bg-gray-50 transition-colors cursor-pointer"
        style={{ borderBottom: expanded ? "none" : "1px solid rgba(0,0,0,0.04)" }}
        onClick={toggleExpand}
      >
        <td className="py-3 px-4" style={{ fontFamily: "monospace", fontSize: 11, color: "#64748B" }}>
          #{booking.id.slice(0, 8).toUpperCase()}
        </td>
        <td className="py-3 px-4 font-medium" style={{ fontFamily: "Tajawal, sans-serif" }}>
          {booking.profiles?.full_name ?? "—"}
          {booking.profiles?.phone && (
            <span style={{ display: "block", fontSize: 11, color: "#94A3B8" }}>{booking.profiles.phone}</span>
          )}
        </td>
        <td className="py-3 px-4" style={{ color: "#374151", fontFamily: "Tajawal, sans-serif" }}>
          {booking.services?.title_ar ?? "—"}
        </td>
        <td className="py-3 px-4" style={{ color: "#64748B", fontSize: 12 }}>{fmtDate(booking.scheduled_at)}</td>
        <td className="py-3 px-4 font-bold" style={{ color: "var(--color-primary)" }}>
          {Number(booking.total ?? 0).toLocaleString("ar-SA")} ر.س
        </td>
        <td className="py-3 px-4"><StatusChip status={booking.status} /></td>
        <td className="py-3 px-4" style={{ color: "#94A3B8", fontSize: 11 }}>{fmtDate(booking.created_at)}</td>
        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {isPending && (
              <button
                onClick={() => onAutoDispatch(booking)}
                title="تعيين تلقائي أفضل مزود"
                style={{ padding: "4px 8px", borderRadius: 7, background: "#EDE9FE", color: "#7C3AED", border: "none", cursor: "pointer", fontSize: 11, fontFamily: "Tajawal, sans-serif", fontWeight: 700, whiteSpace: "nowrap" }}
              >
                🤖 تعيين
              </button>
            )}
            <span style={{ fontSize: 16, transition: "transform 0.2s", display: "inline-block", transform: expanded ? "rotate(90deg)" : "none", cursor: "pointer" }}
              onClick={toggleExpand}>›</span>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr style={{ background: "#F8FAFC" }}>
          <td colSpan={8} style={{ padding: "0 16px 16px" }}>
            <div style={{ display: "flex", gap: 16, paddingTop: 12, flexWrap: "wrap" }}>
              {/* Left: details */}
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", marginBottom: 8, fontFamily: "Tajawal, sans-serif" }}>تفاصيل الحجز</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {booking.provider_profile?.full_name && (
                    <DetailRow label="المزود" value={booking.provider_profile.full_name} />
                  )}
                  {booking.addresses && (
                    <DetailRow label="العنوان"
                      value={[booking.addresses.district, booking.addresses.city, booking.addresses.street].filter(Boolean).join("، ") || "—"} />
                  )}
                  {booking.payment_method && (
                    <DetailRow label="طريقة الدفع" value={booking.payment_method === "cash" ? "نقداً" : booking.payment_method} />
                  )}
                  {booking.notes && <DetailRow label="ملاحظات" value={booking.notes} />}
                </div>
              </div>
              {/* Middle: timeline */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", marginBottom: 4, fontFamily: "Tajawal, sans-serif" }}>مسار الطلب</div>
                <BookingTimeline logs={logs} currentStatus={booking.status} />
              </div>
              {/* Right: status change */}
              <div style={{ minWidth: 200 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", marginBottom: 8, fontFamily: "Tajawal, sans-serif" }}>تغيير الحالة</div>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as BookingStatus)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: "100%", padding: "8px 12px", borderRadius: 10, border: "1px solid #E2E8F0",
                    fontFamily: "Tajawal, sans-serif", fontSize: 13, background: "#FFF", marginBottom: 8,
                    outline: "none", cursor: "pointer",
                  }}
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <button
                  disabled={changing || newStatus === booking.status}
                  onClick={(e) => { e.stopPropagation(); applyStatus(); }}
                  style={{
                    width: "100%", padding: "9px 0", borderRadius: 10, border: "none",
                    background: changing || newStatus === booking.status
                      ? "#E2E8F0" : "linear-gradient(135deg, #16C47F, #0FA868)",
                    color: changing || newStatus === booking.status ? "#94A3B8" : "#FFF",
                    fontFamily: "Tajawal, sans-serif", fontWeight: 700, fontSize: 13,
                    cursor: changing ? "wait" : "pointer", transition: "all 0.15s",
                  }}
                >
                  {changing ? "جاري التحديث…" : "تطبيق الحالة + إشعار"}
                </button>
                <p style={{ fontSize: 10, color: "#94A3B8", marginTop: 6, textAlign: "center", fontFamily: "Tajawal, sans-serif" }}>
                  سيصل إشعار push للعميل فوراً
                </p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
      <span style={{ fontSize: 11, color: "#94A3B8", fontFamily: "Tajawal, sans-serif", minWidth: 70 }}>{label}</span>
      <span style={{ fontSize: 12, color: "#374151", fontFamily: "Tajawal, sans-serif", flex: 1 }}>{value}</span>
    </div>
  );
}

// ── Main Bookings Page ────────────────────────────────────────────────────────
const STATUS_FILTERS = [
  { value: "all",         label: "الكل" },
  { value: "pending",     label: "انتظار" },
  { value: "accepted",    label: "مقبول" },
  { value: "on_the_way",  label: "في الطريق" },
  { value: "in_progress", label: "قيد التنفيذ" },
  { value: "completed",   label: "مكتمل" },
  { value: "cancelled",   label: "ملغي" },
];

export default function Bookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [dispatchModal, setDispatchModal] = useState<{ result: any; bookingId: string } | null>(null);
  const [dispatching, setDispatching] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        id, status, total, created_at, scheduled_at, payment_method, notes, user_id,
        profiles:profiles!bookings_user_id_fkey(full_name, phone),
        services:service_id(title_ar),
        provider_profile:profiles!bookings_provider_id_fkey(full_name),
        addresses:address_id(street, district, city, lat, lng)
      `)
      .order("created_at", { ascending: false })
      .limit(200);
    if (!error) setBookings((data as any) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-bookings-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  async function handleStatusChange(bookingId: string, newStatus: BookingStatus) {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;
    const { error } = await supabase.from("bookings").update({ status: newStatus }).eq("id", bookingId);
    if (error) { showToast("خطأ: " + error.message); return; }
    await supabase.from("booking_status_log").insert({
      booking_id: bookingId, status: newStatus,
      note: `تم التحديث من لوحة الإدارة إلى: ${STATUS_AR[newStatus] ?? newStatus}`,
    });
    const userId = (booking as any).user_id;
    if (userId) notifyUser(userId, newStatus, bookingId);
    showToast(`✓ الحالة محدّثة: ${STATUS_AR[newStatus] ?? newStatus}`);
    load();
  }

  // ── Auto-Dispatch ─────────────────────────────────────────────────────────
  async function handleAutoDispatch(booking: Booking) {
    setDispatching(booking.id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const lat = booking.addresses?.lat;
      const lng = booking.addresses?.lng;
      const url = new URL(`${API_BASE}/api/dispatch/suggest`);
      if (lat) url.searchParams.set("lat", String(lat));
      if (lng) url.searchParams.set("lng", String(lng));
      const res = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const result = await res.json();
      if (!result?.suggestions?.length) {
        showToast("⚠️ لا يوجد مزود متاح حالياً في المنطقة");
      } else {
        setDispatchModal({ result, bookingId: booking.id });
      }
    } catch {
      showToast("خطأ في الاتصال بخادم التعيين");
    } finally {
      setDispatching(null);
    }
  }

  async function confirmDispatch(providerId: string) {
    if (!dispatchModal) return;
    const { bookingId } = dispatchModal;
    await supabase.from("bookings").update({ provider_id: providerId, status: "accepted" }).eq("id", bookingId);
    await supabase.from("booking_status_log").insert({
      booking_id: bookingId, status: "accepted",
      note: "تم التعيين التلقائي من لوحة الإدارة",
    });
    const booking = bookings.find((b) => b.id === bookingId);
    if (booking?.user_id) notifyUser(booking.user_id, "accepted", bookingId);
    setDispatchModal(null);
    showToast("✅ تم تعيين المزود وإخطار العميل");
    load();
  }

  const filtered = bookings.filter((b) => {
    const matchStatus = filter === "all" || b.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q
      || b.id.toLowerCase().includes(q)
      || b.profiles?.full_name?.toLowerCase().includes(q)
      || b.services?.title_ar?.toLowerCase().includes(q);
    const created = new Date(b.created_at);
    const matchFrom = !dateFrom || created >= new Date(dateFrom);
    const matchTo   = !dateTo   || created <= new Date(dateTo + "T23:59:59");
    return matchStatus && matchSearch && matchFrom && matchTo;
  });

  const pendingCount = bookings.filter((b) => b.status === "pending").length;

  return (
    <div className="p-6" style={{ position: "relative" }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: "#0F172A", color: "#FFF", padding: "10px 20px", borderRadius: 12,
          fontFamily: "Tajawal, sans-serif", fontSize: 13, fontWeight: 700, zIndex: 9999,
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        }}>
          {toast}
        </div>
      )}

      {/* Auto-dispatch modal */}
      {dispatchModal && (
        <AutoDispatchModal
          result={dispatchModal.result}
          onConfirm={confirmDispatch}
          onClose={() => setDispatchModal(null)}
        />
      )}

      <PageHeader
        title="📅 إدارة الحجوزات"
        subtitle="تحديث حالات الطلبات وإرسال إشعارات فورية — مع التعيين التلقائي الذكي"
        action={
          <button
            onClick={() => exportCSV(filtered, `bookings-${filter}-${new Date().toISOString().slice(0, 10)}.csv`)}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10,
              background: "#F1F5F9", color: "#374151", border: "none", cursor: "pointer",
              fontFamily: "Tajawal, sans-serif", fontSize: 13, fontWeight: 700,
            }}
          >
            📥 تصدير CSV ({filtered.length})
          </button>
        }
      />

      {/* Stats bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "الكل", count: bookings.length, color: "#64748B", bg: "#F1F5F9" },
          { label: "انتظار", count: bookings.filter(b => b.status === "pending").length, color: "#F59E0B", bg: "#FEF3C7" },
          { label: "نشط", count: bookings.filter(b => ["accepted","on_the_way","in_progress"].includes(b.status)).length, color: "#3B82F6", bg: "#EFF6FF" },
          { label: "مكتمل", count: bookings.filter(b => b.status === "completed").length, color: "#16C47F", bg: "#DCFCE7" },
          { label: "ملغي", count: bookings.filter(b => b.status === "cancelled").length, color: "#EF4444", bg: "#FEE2E2" },
        ].map((s) => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: "8px 16px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 18, color: s.color }}>{s.count}</span>
            <span style={{ fontSize: 12, color: s.color, fontFamily: "Tajawal, sans-serif" }}>{s.label}</span>
          </div>
        ))}
        {pendingCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: "auto" }}>
            <span className="live-dot" />
            <span style={{ fontSize: 12, color: "#F59E0B", fontWeight: 700, fontFamily: "Tajawal, sans-serif" }}>
              {pendingCount} طلب — اضغط 🤖 للتعيين التلقائي
            </span>
          </div>
        )}
      </div>

      <Card className="overflow-hidden p-0">
        {/* Filters */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث باسم العميل أو الخدمة أو رقم الطلب…"
              style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 13, fontFamily: "Tajawal, sans-serif", outline: "none", width: 260 }}
            />
            {/* Date range */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 12, color: "#94A3B8", fontFamily: "Tajawal, sans-serif" }}>من</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{ padding: "7px 10px", borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12, outline: "none" }}
              />
              <span style={{ fontSize: 12, color: "#94A3B8", fontFamily: "Tajawal, sans-serif" }}>إلى</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{ padding: "7px 10px", borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12, outline: "none" }}
              />
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => { setDateFrom(""); setDateTo(""); }}
                  style={{ padding: "6px 10px", borderRadius: 8, background: "#FEE2E2", color: "#EF4444", border: "none", cursor: "pointer", fontSize: 12, fontFamily: "Tajawal, sans-serif" }}
                >
                  ×
                </button>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                style={{
                  padding: "6px 14px", borderRadius: 100, border: "none", cursor: "pointer",
                  fontFamily: "Tajawal, sans-serif", fontSize: 12, fontWeight: filter === f.value ? 700 : 500,
                  background: filter === f.value ? "var(--color-primary)" : "#F1F5F9",
                  color: filter === f.value ? "#FFF" : "#374151", transition: "all 0.15s",
                }}
              >
                {f.label}
              </button>
            ))}
            <span style={{ marginRight: "auto", fontSize: 12, color: "#94A3B8" }}>{filtered.length} طلب</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                {["رقم الطلب", "العميل", "الخدمة", "الموعد", "المبلغ", "الحالة", "تاريخ الطلب", ""].map((h) => (
                  <th key={h} className="py-3 px-4 font-bold text-right" style={{ color: "#94A3B8", fontSize: 11, fontFamily: "Tajawal, sans-serif", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="py-12 text-center" style={{ color: "#94A3B8", fontFamily: "Tajawal, sans-serif" }}>جاري التحميل…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center" style={{ color: "#94A3B8", fontFamily: "Tajawal, sans-serif" }}>لا توجد حجوزات</td></tr>
              )}
              {filtered.map((b) => (
                <BookingRow
                  key={b.id}
                  booking={b}
                  onStatusChange={handleStatusChange}
                  onAutoDispatch={handleAutoDispatch}
                />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
