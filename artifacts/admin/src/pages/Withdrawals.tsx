import { useEffect, useState, useCallback } from "react";
import { Card, PageHeader } from "@/components/Layout";
import { supabase } from "@/lib/supabase";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  `https://${window.location.hostname.replace(/^\d+-/, "8080-")}`;

type PayoutRow = {
  id: string;
  provider_id: string;
  amount: number;
  status: "pending" | "paid" | "failed";
  iban: string | null;
  method: string | null;
  created_at: string;
  provider_profile: { full_name: string | null; phone: string | null } | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "قيد المراجعة",
  paid: "تم التحويل",
  failed: "فشل",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "#F59E0B",
  paid: "#16C47F",
  failed: "#EF4444",
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("ar-SA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

async function notifyProviderPayoutResult(
  providerId: string,
  approved: boolean,
  amount: number,
) {
  const title = approved
    ? "✅ تمت الموافقة على طلب السحب"
    : "❌ تعذّر تنفيذ طلب السحب";
  const body = approved
    ? `تمت الموافقة على سحب ${amount} ر.س — سيتم التحويل قريباً`
    : `تعذّر تنفيذ سحب ${amount} ر.س، يرجى التواصل مع الدعم`;

  await supabase.from("notifications").insert({
    user_id: providerId,
    title,
    body,
    type: approved ? "withdrawal_approved" : "withdrawal",
    data: { amount, approved },
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
      body: JSON.stringify({
        userId: providerId,
        title,
        body,
        data: { type: approved ? "withdrawal_approved" : "withdrawal", amount },
        categoryIdentifier: approved ? "withdrawal_approved" : "withdrawal",
        channelId: "payment",
      }),
    });
  } catch {}
}

export default function Withdrawals() {
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "paid" | "failed">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("payouts")
      .select("id, provider_id, amount, status, iban, method, created_at, provider_profile:profiles!payouts_provider_id_fkey(full_name, phone)")
      .order("created_at", { ascending: false })
      .limit(150);
    if (error) setErr(error.message);
    else setRows((data as any) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (row: PayoutRow, newStatus: "paid" | "failed") => {
    setBusy(row.id);
    try {
      const { error } = await supabase
        .from("payouts")
        .update({ status: newStatus })
        .eq("id", row.id);
      if (error) throw error;

      await notifyProviderPayoutResult(row.provider_id, newStatus === "paid", row.amount);
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
  const counts = {
    all: rows.length,
    pending: rows.filter((r) => r.status === "pending").length,
    paid: rows.filter((r) => r.status === "paid").length,
    failed: rows.filter((r) => r.status === "failed").length,
  };
  const totalPending = rows
    .filter((r) => r.status === "pending")
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="طلبات السحب"
        subtitle={`${rows.length} طلب إجمالي — ${counts.pending} قيد المراجعة — إجمالي معلّق: ${totalPending.toLocaleString("ar-SA")} ر.س`}
      />

      {err && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{err}</div>
      )}

      <div className="flex gap-2 flex-wrap">
        {(["all", "pending", "paid", "failed"] as const).map((s) => (
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
        <button
          onClick={load}
          className="mr-auto px-4 py-1.5 rounded-full text-sm border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
        >
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
            return (
              <Card key={row.id}>
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: STATUS_COLOR[row.status] + "22",
                            color: STATUS_COLOR[row.status],
                          }}
                        >
                          {STATUS_LABEL[row.status]}
                        </span>
                        <span className="text-xs text-slate-400">{fmt(row.created_at)}</span>
                      </div>
                      <p className="font-bold text-slate-800">
                        {row.provider_profile?.full_name || row.provider_id.slice(0, 8)}
                        {row.provider_profile?.phone && (
                          <span className="text-slate-400 font-normal text-sm mr-2">
                            {row.provider_profile.phone}
                          </span>
                        )}
                      </p>
                      {row.iban && (
                        <p className="text-sm text-slate-500 mt-0.5 font-mono">
                          IBAN: {row.iban}
                        </p>
                      )}
                      {row.method && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          طريقة السحب:{" "}
                          {row.method === "bank"
                            ? "حوالة بنكية"
                            : row.method === "stc"
                            ? "STC Pay"
                            : row.method === "wallet"
                            ? "محفظة محلية"
                            : row.method}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-bold text-emerald-600">
                        {Number(row.amount).toLocaleString("ar-SA")}
                      </p>
                      <p className="text-xs text-slate-400">ر.س</p>
                    </div>
                  </div>

                  {isPending && (
                    <div className="flex gap-2 pt-1 border-t border-slate-100">
                      <button
                        disabled={busy === row.id}
                        onClick={() => updateStatus(row, "failed")}
                        className="flex-1 py-2 rounded-xl border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {busy === row.id ? "…" : "رفض / فشل"}
                      </button>
                      <button
                        disabled={busy === row.id}
                        onClick={() => updateStatus(row, "paid")}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        {busy === row.id ? "…" : "✓ تأكيد التحويل"}
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
