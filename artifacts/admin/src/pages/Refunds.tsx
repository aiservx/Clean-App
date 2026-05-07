import { useEffect, useState, useCallback } from "react";
import { Card, PageHeader } from "@/components/Layout";
import { supabase } from "@/lib/supabase";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  `https://${window.location.hostname.replace(/^\d+-/, "8080-")}`;

type RefundRow = {
  id: string;
  booking_id: string;
  user_id: string;
  amount: number;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  profiles: { full_name: string | null; phone: string | null } | null;
  bookings: { total: number; status: string; provider_id: string | null } | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "مقبول",
  rejected: "مرفوض",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "#F59E0B",
  approved: "#16C47F",
  rejected: "#EF4444",
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("ar-SA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

async function notifyRefundResult(
  userId: string,
  approved: boolean,
  amount: number,
  bookingId: string,
) {
  const title = approved
    ? "✅ تمت الموافقة على طلب الاسترداد"
    : "❌ رُفض طلب الاسترداد";
  const body = approved
    ? `تمت الموافقة على استرداد ${amount} ر.س — سيتم التحويل خلال 3-5 أيام عمل`
    : `تم رفض طلب استرداد ${amount} ر.س، يمكنك التواصل مع الدعم للمزيد`;

  await supabase.from("notifications").insert({
    user_id: userId,
    title,
    body,
    type: "refund_result",
    data: { booking_id: bookingId, approved },
    read: false,
  });

  try {
    const { data: sd } = await supabase.auth.getSession();
    const token = sd?.session?.access_token;
    if (!token) return;
    await fetch(`${API_BASE}/api/push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId, title, body, data: { type: "refund_result", bookingId } }),
    });
  } catch {}
}

async function deductProviderWallet(providerId: string | null, amount: number, bookingId: string) {
  if (!providerId) return;
  try {
    await supabase.from("payouts").insert({
      provider_id: providerId,
      amount,
      status: "paid",
      type: "refund",
      notes: `خصم استرداد للعميل — رقم الحجز ${bookingId.slice(0, 8)}`,
    });
  } catch (e) {
    console.warn("[refunds] wallet deduction failed:", e);
  }
}

export default function Refunds() {
  const [rows, setRows] = useState<RefundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const q = supabase
      .from("refund_requests")
      .select("id, booking_id, user_id, amount, reason, status, created_at, profiles:user_id(full_name, phone), bookings:booking_id(total, status, provider_id)")
      .order("created_at", { ascending: false })
      .limit(100);
    const { data, error } = await q;
    if (error) setErr(error.message);
    else setRows((data as any) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (row: RefundRow, newStatus: "approved" | "rejected") => {
    setBusy(row.id);
    try {
      const { error } = await supabase
        .from("refund_requests")
        .update({ status: newStatus })
        .eq("id", row.id);
      if (error) throw error;

      if (newStatus === "approved") {
        const providerId = row.bookings?.provider_id ?? null;
        await deductProviderWallet(providerId, row.amount, row.booking_id);
      }

      await notifyRefundResult(row.user_id, newStatus === "approved", row.amount, row.booking_id);

      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, status: newStatus } : r)),
      );
    } catch (e: any) {
      alert("خطأ: " + e.message);
    } finally {
      setBusy(null);
    }
  };

  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);
  const counts = { all: rows.length, pending: rows.filter((r) => r.status === "pending").length, approved: rows.filter((r) => r.status === "approved").length, rejected: rows.filter((r) => r.status === "rejected").length };

  return (
    <div className="space-y-6">
      <PageHeader title="طلبات الاسترداد" subtitle={`${rows.length} طلب إجمالي — ${counts.pending} قيد المراجعة`} />

      {err && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{err}</div>}

      <div className="flex gap-2 flex-wrap">
        {(["all", "pending", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === s
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"
            }`}
          >
            {s === "all" ? "الكل" : STATUS_LABEL[s]} ({counts[s]})
          </button>
        ))}
        <button onClick={load} className="mr-auto px-4 py-1.5 rounded-full text-sm border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors">
          ↻ تحديث
        </button>
      </div>

      {loading ? (
        <Card><div className="py-16 text-center text-slate-400">جاري التحميل…</div></Card>
      ) : filtered.length === 0 ? (
        <Card><div className="py-16 text-center text-slate-400">لا توجد طلبات</div></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => {
            const isPending = row.status === "pending";
            const provId = row.bookings?.provider_id;
            return (
              <Card key={row.id}>
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: STATUS_COLOR[row.status] + "22", color: STATUS_COLOR[row.status] }}
                        >
                          {STATUS_LABEL[row.status]}
                        </span>
                        <span className="text-xs text-slate-400">{fmt(row.created_at)}</span>
                      </div>
                      <p className="font-bold text-slate-800">
                        {row.profiles?.full_name || row.user_id.slice(0, 8)}
                        {row.profiles?.phone && (
                          <span className="text-slate-400 font-normal text-sm mr-2">{row.profiles.phone}</span>
                        )}
                      </p>
                      <p className="text-sm text-slate-500 mt-0.5">
                        رقم الحجز: <span className="font-mono text-xs">{row.booking_id.slice(0, 8)}…</span>
                        {provId && (
                          <span className="text-slate-400 mr-3 text-xs">
                            (سيتم خصم المبلغ من محفظة المزود)
                          </span>
                        )}
                        {!provId && isPending && (
                          <span className="text-amber-500 mr-3 text-xs">
                            (لا يوجد مزود مرتبط بالحجز)
                          </span>
                        )}
                      </p>
                      {row.reason && (
                        <p className="text-sm text-slate-600 mt-1 bg-slate-50 rounded-lg px-3 py-2">{row.reason}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-bold text-emerald-600">{row.amount}</p>
                      <p className="text-xs text-slate-400">ر.س</p>
                    </div>
                  </div>

                  {isPending && (
                    <div className="flex gap-2 pt-1 border-t border-slate-100">
                      <button
                        disabled={busy === row.id}
                        onClick={() => updateStatus(row, "rejected")}
                        className="flex-1 py-2 rounded-xl border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {busy === row.id ? "…" : "رفض"}
                      </button>
                      <button
                        disabled={busy === row.id}
                        onClick={() => updateStatus(row, "approved")}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        {busy === row.id ? "…" : "✓ قبول الاسترداد"}
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
