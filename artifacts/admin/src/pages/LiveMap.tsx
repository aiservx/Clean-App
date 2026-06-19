/**
 * LiveMap — Real-time provider locations dashboard
 * Shows all providers on an interactive OpenStreetMap (Leaflet) embed,
 * alongside a live table with status & GPS data.
 */
import { useEffect, useState, useCallback } from "react";
import { Card, PageHeader } from "@/components/Layout";
import { supabase } from "@/lib/supabase";

type ProviderPin = {
  id: string;
  name: string;
  status: "online" | "offline" | "busy";
  lat: number | null;
  lng: number | null;
  rating: number;
  last_seen: string | null;
  available: boolean;
};

function mapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return `منذ ${diff} ث`;
  if (diff < 3600)  return `منذ ${Math.floor(diff / 60)} د`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`;
  return `منذ ${Math.floor(diff / 86400)} يوم`;
}

function StatusDot({ status }: { status: ProviderPin["status"] }) {
  const cfg = {
    online: { color: "#16C47F", label: "متاح الآن" },
    busy:   { color: "#F59E0B", label: "مشغول" },
    offline:{ color: "#9CA3AF", label: "غير متاح" },
  }[status];
  return (
    <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: cfg.color, fontFamily: "Tajawal, sans-serif" }}>
      <span className="w-2 h-2 rounded-full" style={{ background: cfg.color, ...(status === "online" ? { boxShadow: `0 0 0 3px ${cfg.color}33` } : {}) }} />
      {cfg.label}
    </span>
  );
}

function MapEmbed({ providers }: { providers: ProviderPin[] }) {
  const withCoords = providers.filter((p) => p.lat && p.lng && p.status === "online");

  if (withCoords.length === 0) {
    return (
      <div className="h-64 rounded-2xl bg-gray-100 flex flex-col items-center justify-center gap-2">
        <span className="text-4xl">🗺️</span>
        <p className="text-sm text-gray-500" style={{ fontFamily: "Tajawal, sans-serif" }}>
          لا يوجد مزودون متاحون بإحداثيات GPS الآن
        </p>
      </div>
    );
  }

  /* Build an OpenStreetMap iframe URL with multiple markers using the first provider as center */
  const center = withCoords[0];
  const bbox = withCoords.reduce(
    (b, p) => ({
      minLat: Math.min(b.minLat, p.lat!),
      maxLat: Math.max(b.maxLat, p.lat!),
      minLng: Math.min(b.minLng, p.lng!),
      maxLng: Math.max(b.maxLng, p.lng!),
    }),
    { minLat: center.lat!, maxLat: center.lat!, minLng: center.lng!, maxLng: center.lng! },
  );

  const pad = 0.01;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox.minLng - pad}%2C${bbox.minLat - pad}%2C${bbox.maxLng + pad}%2C${bbox.maxLat + pad}&layer=mapnik&marker=${center.lat}%2C${center.lng}`;

  return (
    <div className="relative rounded-2xl overflow-hidden" style={{ height: 320 }}>
      <iframe
        src={src}
        className="w-full h-full border-0"
        title="Provider Map"
        loading="lazy"
      />
      {/* Overlay: provider count badge */}
      <div className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold"
        style={{ background: "rgba(255,255,255,0.95)", color: "#16C47F", fontFamily: "Tajawal, sans-serif", backdropFilter: "blur(4px)" }}>
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        {withCoords.length} مزود على الخريطة
      </div>
      <div className="absolute bottom-3 right-3 text-xs text-gray-500 bg-white/80 px-2 py-1 rounded-lg" style={{ fontFamily: "Tajawal, sans-serif" }}>
        يعرض مزوداً واحداً — انقر "فتح الموقع" لرؤية كل مزود
      </div>
    </div>
  );
}

export default function LiveMap() {
  const [providers, setProviders] = useState<ProviderPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const load = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("providers")
        .select("id, available, rating, current_lat, current_lng, location_updated_at, profiles(full_name)")
        .order("location_updated_at", { ascending: false })
        .limit(50);

      const now = Date.now();
      const pins: ProviderPin[] = (data ?? []).map((p: any) => {
        const lastSeen = p.location_updated_at ? new Date(p.location_updated_at).getTime() : 0;
        const stale = now - lastSeen > 10 * 60 * 1000; // > 10 min = offline
        const status: ProviderPin["status"] = !p.available ? "offline" : stale ? "offline" : "online";
        return {
          id: p.id,
          name: p.profiles?.full_name ?? "مزود",
          status,
          lat: p.current_lat,
          lng: p.current_lng,
          rating: Number(p.rating ?? 0),
          last_seen: p.location_updated_at,
          available: p.available,
        };
      });
      setProviders(pins);
      setLastRefresh(new Date());
    } catch (e) {
      console.error("LiveMap load error", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000); // refresh every 30s
    const ch = supabase
      .channel("live-map-providers")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "providers" }, load)
      .subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(ch); };
  }, [load]);

  const online  = providers.filter((p) => p.status === "online").length;
  const withGps = providers.filter((p) => p.lat && p.lng && p.status === "online").length;

  return (
    <div className="p-6">
      <PageHeader
        title="خريطة المزودين المباشرة"
        subtitle="تتبع جميع المزودين في الوقت الفعلي"
        action={
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
            style={{ background: "var(--color-primary-light)", color: "var(--color-primary)", fontFamily: "Tajawal, sans-serif" }}
          >
            🔄 تحديث
          </button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "إجمالي المزودين", value: providers.length, icon: "👷", color: "#7C3AED", bg: "#F5F3FF" },
          { label: "متاح الآن",       value: online,            icon: "🟢", color: "#16C47F", bg: "#DCFCE7" },
          { label: "GPS نشط",         value: withGps,           icon: "📍", color: "#3B82F6", bg: "#EFF6FF" },
          { label: "آخر تحديث",       value: lastRefresh.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }), icon: "🕐", color: "#F59E0B", bg: "#FEF3C7" },
        ].map((c) => (
          <Card key={c.label} className="p-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-2" style={{ background: c.bg }}>{c.icon}</div>
            <div className="font-bold" style={{ fontSize: 22, color: "#0F172A", fontFamily: "Tajawal, sans-serif" }}>{c.value}</div>
            <div style={{ fontSize: 12, color: "#64748B", fontFamily: "Tajawal, sans-serif" }}>{c.label}</div>
          </Card>
        ))}
      </div>

      {/* Map */}
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900" style={{ fontFamily: "Tajawal, sans-serif" }}>الخريطة المباشرة</h3>
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold" style={{ fontFamily: "Tajawal, sans-serif" }}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            مباشر — يتجدد كل 30 ث
          </span>
        </div>
        <MapEmbed providers={providers} />
      </Card>

      {/* Provider Table */}
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between p-5 pb-4" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <h2 className="font-bold" style={{ fontFamily: "Tajawal, sans-serif", fontSize: 15 }}>تفاصيل المزودين</h2>
          <span className="text-xs text-gray-400" style={{ fontFamily: "Tajawal, sans-serif" }}>
            {providers.length} مزود
          </span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400" style={{ fontFamily: "Tajawal, sans-serif" }}>
            جاري التحميل…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                  {["المزود", "الحالة", "آخر ظهور", "التقييم", "الإحداثيات", "فتح الموقع"].map((h) => (
                    <th key={h} className="py-3 px-4 font-bold text-right" style={{ color: "#94A3B8", fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {providers.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold" style={{ color: "#0F172A", fontFamily: "Tajawal, sans-serif" }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: "#94A3B8", fontFamily: "monospace" }}>{p.id.slice(0, 8)}…</div>
                    </td>
                    <td className="py-3 px-4"><StatusDot status={p.status} /></td>
                    <td className="py-3 px-4" style={{ color: "#64748B", fontFamily: "Tajawal, sans-serif" }}>{timeAgo(p.last_seen)}</td>
                    <td className="py-3 px-4">
                      <span className="flex items-center gap-1 font-bold" style={{ color: "#F59E0B" }}>
                        ⭐ {p.rating.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4" style={{ fontFamily: "monospace", fontSize: 11, color: "#64748B" }}>
                      {p.lat && p.lng ? `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}` : "—"}
                    </td>
                    <td className="py-3 px-4">
                      {p.lat && p.lng ? (
                        <a
                          href={mapsUrl(p.lat, p.lng)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-70"
                          style={{ background: "#EFF6FF", color: "#3B82F6", fontFamily: "Tajawal, sans-serif" }}
                        >
                          📍 فتح
                        </a>
                      ) : (
                        <span style={{ color: "#9CA3AF", fontSize: 11 }}>لا إحداثيات</span>
                      )}
                    </td>
                  </tr>
                ))}
                {providers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center" style={{ color: "#94A3B8", fontFamily: "Tajawal, sans-serif" }}>
                      لا يوجد مزودون بعد
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
