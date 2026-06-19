/**
 * Providers Management — Rich Cards View with Performance Metrics
 * Approve/Suspend with push notification, batch actions, location indicator
 */
import { useEffect, useState, useCallback } from "react";
import { Card, PageHeader } from "@/components/Layout";
import { supabase } from "@/lib/supabase";

const API_BASE = import.meta.env.VITE_API_URL ||
  `https://${window.location.hostname.replace(/^\d+-/, "8080-")}`;

type Provider = {
  id: string;
  bio: string | null;
  status: "pending" | "approved" | "suspended";
  available: boolean;
  rating: number;
  total_jobs: number;
  hourly_rate: number;
  experience_years: number;
  vehicle: string | null;
  iban: string | null;
  current_lat: number | null;
  current_lng: number | null;
  location_updated_at: string | null;
  profiles: { full_name: string; phone: string | null; email: string | null; avatar_url: string | null } | null;
};

const STATUS_CONFIG = {
  pending:   { label: "قيد المراجعة", color: "#F59E0B", bg: "#FEF3C7" },
  approved:  { label: "مقبول",        color: "#16C47F", bg: "#DCFCE7" },
  suspended: { label: "موقوف",        color: "#EF4444", bg: "#FEE2E2" },
};

// ── Notify provider of status change ─────────────────────────────────────────
async function notifyProvider(userId: string, status: "approved" | "suspended") {
  const messages = {
    approved:  { title: "✅ تم قبول طلبك!", body: "مبروك! تم قبولك كمزود خدمة في نظافة. يمكنك الآن تفعيل حسابك وقبول الطلبات." },
    suspended: { title: "⚠️ تم إيقاف حسابك", body: "تم إيقاف حسابك مؤقتاً. تواصل مع الدعم الفني لمزيد من المعلومات." },
  };
  const msg = messages[status];
  try {
    await supabase.from("notifications").insert({
      user_id: userId, title: msg.title, body: msg.body,
      type: "account_status", read: false,
      data: { status },
    });
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (token) {
      await fetch(`${API_BASE}/api/push`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, title: msg.title, body: msg.body, data: { type: "account_status", status } }),
      });
    }
  } catch (e) { console.error("notifyProvider error", e); }
}

// ── Star rating display ───────────────────────────────────────────────────────
function Stars({ rating }: { rating: number }) {
  return (
    <span>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} style={{ color: s <= Math.round(rating) ? "#F59E0B" : "#E2E8F0", fontSize: 12 }}>★</span>
      ))}
      <span style={{ fontSize: 11, color: "#64748B", marginRight: 4 }}>{rating.toFixed(1)}</span>
    </span>
  );
}

// ── Location freshness ────────────────────────────────────────────────────────
function LocationBadge({ updatedAt, available }: { updatedAt: string | null; available: boolean }) {
  if (!updatedAt || !available) return <span style={{ fontSize: 10, color: "#94A3B8" }}>غير متاح</span>;
  const diffMin = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 60000);
  const isLive = diffMin < 5;
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: isLive ? "#16C47F" : "#F59E0B", display: "inline-block" }} />
      <span style={{ fontSize: 10, color: isLive ? "#16C47F" : "#F59E0B", fontFamily: "Tajawal, sans-serif" }}>
        {isLive ? "مباشر" : `${diffMin} د`}
      </span>
    </span>
  );
}

// ── Provider Card ─────────────────────────────────────────────────────────────
function ProviderCard({ provider, onStatusChange, selected, onSelect }: {
  provider: Provider;
  onStatusChange: (id: string, status: "approved" | "suspended") => void;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const sc = STATUS_CONFIG[provider.status];
  const initials = provider.profiles?.full_name?.slice(0, 2) || "؟";
  const completionRate = provider.total_jobs > 0 ? Math.min(100, provider.total_jobs) : 0;

  return (
    <Card className="p-5 relative" style={{ border: selected ? "2px solid #16C47F" : "2px solid transparent", transition: "border 0.15s" }}>
      {/* Select checkbox */}
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onSelect(provider.id)}
        onClick={(e) => e.stopPropagation()}
        style={{ position: "absolute", top: 12, left: 12, width: 16, height: 16, cursor: "pointer", accentColor: "#16C47F" }}
      />

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div style={{
          width: 48, height: 48, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center",
          background: "linear-gradient(135deg,#16C47F,#0FA868)", color: "#FFF", fontWeight: 700, fontSize: 18, flexShrink: 0,
          fontFamily: "Tajawal, sans-serif",
        }}>
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#0F172A", fontFamily: "Tajawal, sans-serif" }}>
            {provider.profiles?.full_name ?? "—"}
          </div>
          <div style={{ fontSize: 11, color: "#64748B", fontFamily: "Tajawal, sans-serif" }}>
            {provider.profiles?.phone ?? provider.profiles?.email ?? "—"}
          </div>
          <Stars rating={provider.rating} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, color: sc.color, background: sc.bg, fontFamily: "Tajawal, sans-serif" }}>
            {sc.label}
          </span>
          <LocationBadge updatedAt={provider.location_updated_at} available={provider.available} />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
        {[
          { label: "مهام", value: provider.total_jobs },
          { label: "ر.س/ساعة", value: provider.hourly_rate },
          { label: "سنوات خبرة", value: provider.experience_years },
        ].map((s) => (
          <div key={s.label} style={{ textAlign: "center", background: "#F8FAFC", borderRadius: 10, padding: "8px 4px" }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#0F172A" }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "#94A3B8", fontFamily: "Tajawal, sans-serif" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Completion bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: "#64748B", fontFamily: "Tajawal, sans-serif" }}>الأداء التراكمي</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#16C47F" }}>{completionRate} طلب</span>
        </div>
        <div style={{ background: "#E2E8F0", borderRadius: 4, height: 5 }}>
          <div style={{ background: "#16C47F", height: 5, borderRadius: 4, width: `${Math.min(100, completionRate)}%`, transition: "width 0.5s" }} />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 6 }}>
        {provider.status !== "approved" && (
          <button
            onClick={() => onStatusChange(provider.id, "approved")}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 10, border: "none", cursor: "pointer",
              background: "#DCFCE7", color: "#16C47F", fontFamily: "Tajawal, sans-serif", fontSize: 12, fontWeight: 700,
            }}
          >
            ✅ قبول
          </button>
        )}
        {provider.status !== "suspended" && (
          <button
            onClick={() => onStatusChange(provider.id, "suspended")}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 10, border: "none", cursor: "pointer",
              background: "#FEE2E2", color: "#EF4444", fontFamily: "Tajawal, sans-serif", fontSize: 12, fontWeight: 700,
            }}
          >
            🚫 إيقاف
          </button>
        )}
        {provider.status === "approved" && !provider.available && (
          <span style={{ flex: 1, textAlign: "center", padding: "8px 0", fontSize: 11, color: "#94A3B8", fontFamily: "Tajawal, sans-serif" }}>
            غير متاح حالياً
          </span>
        )}
      </div>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Providers() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("providers")
      .select("*, profiles(full_name, phone, email, avatar_url)")
      .order("rating", { ascending: false });
    setProviders((data as any) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase.channel("admin-providers-v2")
      .on("postgres_changes", { event: "*", schema: "public", table: "providers" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  async function handleStatusChange(id: string, status: "approved" | "suspended") {
    await supabase.from("providers").update({ status }).eq("id", id);
    notifyProvider(id, status);
    showToast(status === "approved" ? "✅ تم قبول المزود وإشعاره" : "🚫 تم إيقاف المزود وإشعاره");
    load();
  }

  async function batchAction(action: "approved" | "suspended") {
    if (!selected.size) return;
    setBatchLoading(true);
    await supabase.from("providers").update({ status: action }).in("id", [...selected]);
    [...selected].forEach((id) => notifyProvider(id, action));
    showToast(`تم تطبيق الإجراء على ${selected.size} مزود`);
    setSelected(new Set());
    setBatchLoading(false);
    load();
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const filtered = providers.filter((p) => {
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch = !q
      || p.profiles?.full_name?.toLowerCase().includes(q)
      || p.profiles?.phone?.includes(q)
      || p.profiles?.email?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const pendingCount = providers.filter((p) => p.status === "pending").length;
  const approvedCount = providers.filter((p) => p.status === "approved").length;
  const liveCount = providers.filter((p) => p.available && p.status === "approved").length;

  return (
    <div className="p-6" dir="rtl" style={{ position: "relative" }}>
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

      <PageHeader title="👷 مقدمو الخدمة" subtitle="إدارة المزودين والموافقة على الطلبات الجديدة" />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "إجمالي المزودين", value: providers.length, color: "#3B82F6", bg: "#EFF6FF" },
          { label: "مقبولون", value: approvedCount, color: "#16C47F", bg: "#DCFCE7" },
          { label: "متاحون الآن 🔴", value: liveCount, color: "#16C47F", bg: "#DCFCE7" },
          { label: "قيد المراجعة", value: pendingCount, color: "#F59E0B", bg: "#FEF3C7" },
        ].map((s) => (
          <Card key={s.label} className="p-4 text-center">
            <div style={{ fontWeight: 700, fontSize: 24, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#64748B", fontFamily: "Tajawal, sans-serif", marginTop: 2 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Alert for pending approvals */}
      {pendingCount > 0 && (
        <div style={{ background: "#FEF3C7", borderRadius: 14, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>⏳</span>
          <div style={{ flex: 1, fontFamily: "Tajawal, sans-serif" }}>
            <div style={{ fontWeight: 700, color: "#92400E", fontSize: 13 }}>
              {pendingCount} مزود ينتظر الموافقة
            </div>
            <div style={{ fontSize: 11, color: "#B45309" }}>راجع طلباتهم أدناه وقم بالموافقة أو الرفض</div>
          </div>
          <button
            onClick={() => setFilterStatus("pending")}
            style={{ padding: "6px 14px", borderRadius: 8, background: "#F59E0B", color: "#FFF", border: "none", cursor: "pointer", fontFamily: "Tajawal, sans-serif", fontSize: 12, fontWeight: 700 }}
          >
            عرض الطلبات
          </button>
        </div>
      )}

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو الهاتف…"
          style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 13, fontFamily: "Tajawal, sans-serif", outline: "none", width: 220 }}
        />
        {["all", "pending", "approved", "suspended"].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            style={{
              padding: "7px 16px", borderRadius: 20, border: "none", cursor: "pointer",
              fontFamily: "Tajawal, sans-serif", fontSize: 12, fontWeight: filterStatus === s ? 700 : 500,
              background: filterStatus === s ? "#16C47F" : "#F1F5F9",
              color: filterStatus === s ? "#FFF" : "#374151",
            }}
          >
            {s === "all" ? "الكل" : s === "pending" ? "⏳ انتظار" : s === "approved" ? "✅ مقبول" : "🚫 موقوف"}
          </button>
        ))}

        {selected.size > 0 && (
          <div style={{ display: "flex", gap: 6, marginRight: "auto", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#64748B", fontFamily: "Tajawal, sans-serif" }}>
              {selected.size} محدد
            </span>
            <button
              onClick={() => batchAction("approved")}
              disabled={batchLoading}
              style={{ padding: "7px 14px", borderRadius: 10, background: "#DCFCE7", color: "#16C47F", border: "none", cursor: "pointer", fontFamily: "Tajawal, sans-serif", fontSize: 12, fontWeight: 700 }}
            >
              ✅ قبول الكل
            </button>
            <button
              onClick={() => batchAction("suspended")}
              disabled={batchLoading}
              style={{ padding: "7px 14px", borderRadius: 10, background: "#FEE2E2", color: "#EF4444", border: "none", cursor: "pointer", fontFamily: "Tajawal, sans-serif", fontSize: 12, fontWeight: 700 }}
            >
              🚫 إيقاف الكل
            </button>
            <button
              onClick={() => setSelected(new Set())}
              style={{ padding: "7px 14px", borderRadius: 10, background: "#F1F5F9", color: "#374151", border: "none", cursor: "pointer", fontFamily: "Tajawal, sans-serif", fontSize: 12 }}
            >
              إلغاء التحديد
            </button>
          </div>
        )}
      </div>

      {/* Cards grid */}
      {loading && (
        <div style={{ textAlign: "center", padding: 48, color: "#94A3B8", fontFamily: "Tajawal, sans-serif" }}>جاري التحميل…</div>
      )}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: 48, color: "#94A3B8", fontFamily: "Tajawal, sans-serif" }}>لا توجد نتائج</div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {filtered.map((p) => (
          <ProviderCard
            key={p.id}
            provider={p}
            selected={selected.has(p.id)}
            onSelect={toggleSelect}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>
    </div>
  );
}
