import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLocation } from "wouter";

type TickerItem = {
  id: string;
  service_title: string | null;
  created_at: string;
  age: number;
};

const STATUS_AR: Record<string, string> = {
  pending: "قيد الانتظار", accepted: "مقبول", completed: "مكتمل", cancelled: "ملغي",
};

export function LiveTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [visible, setVisible] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [, nav] = useLocation();

  useEffect(() => {
    // Initial load — pending bookings in last 30 min
    const load = async () => {
      const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("bookings")
        .select("id, service_title, created_at")
        .eq("status", "pending")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5);
      if (data) {
        setItems(data.map((d: any) => ({
          ...d,
          age: Math.floor((Date.now() - new Date(d.created_at).getTime()) / 60000),
        })));
      }
    };
    load();

    // Realtime subscription for new bookings
    const ch = supabase
      .channel("live-ticker")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bookings" }, (payload) => {
        const bk = payload.new as any;
        setItems((prev) => [
          { id: bk.id, service_title: bk.service_title, created_at: bk.created_at, age: 0 },
          ...prev.slice(0, 4),
        ]);
        // Play subtle ping
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.frequency.value = 880; gain.gain.value = 0.06;
          osc.start(); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
          osc.stop(ctx.currentTime + 0.3);
        } catch {}
      })
      .subscribe();

    // Tick age counter
    const interval = setInterval(() => {
      setItems((prev) => prev.map((i) => ({
        ...i,
        age: Math.floor((Date.now() - new Date(i.created_at).getTime()) / 60000),
      })));
    }, 30000);

    return () => { supabase.removeChannel(ch); clearInterval(interval); };
  }, []);

  if (!visible || items.length === 0) return null;

  return (
    <div
      dir="rtl"
      className="flex items-center gap-3 px-4 py-2 text-sm"
      style={{
        background: "linear-gradient(90deg, #1E3A5F 0%, #0F2744 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        minHeight: 40,
      }}
    >
      {/* Label */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="live-dot" style={{ background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
        <span style={{ color: "#94A3B8", fontFamily: "Tajawal, sans-serif", fontSize: 12, fontWeight: 600 }}>
          طلبات مباشرة
        </span>
        <span
          style={{
            background: "#EF4444", color: "#FFF", borderRadius: 10,
            padding: "0 7px", fontSize: 10, fontWeight: 700, fontFamily: "Tajawal, sans-serif",
          }}
        >
          {items.length}
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.15)" }} />

      {/* Scrolling items */}
      <div className="flex gap-3 overflow-x-auto flex-1" style={{ scrollbarWidth: "none" }}>
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => nav("/bookings")}
            className="shrink-0 flex items-center gap-2 rounded-full px-3 py-1 text-xs transition-all hover:opacity-80"
            style={{
              background: item.age >= 5 ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.10)",
              border: `1px solid ${item.age >= 5 ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.12)"}`,
              color: item.age >= 5 ? "#FCA5A5" : "#E2E8F0",
              fontFamily: "Tajawal, sans-serif",
              cursor: "pointer",
            }}
          >
            <span>{item.age >= 5 ? "🔴" : "🟡"}</span>
            <span style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.service_title ?? "طلب جديد"}
            </span>
            <span style={{ opacity: 0.7 }}>
              {item.age === 0 ? "الآن" : `${item.age} د`}
            </span>
          </button>
        ))}
      </div>

      {/* Close */}
      <button
        onClick={() => setVisible(false)}
        style={{ color: "#475569", background: "none", border: "none", cursor: "pointer", padding: 4, flexShrink: 0 }}
        title="إخفاء"
      >
        ×
      </button>
    </div>
  );
}
