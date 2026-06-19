import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/lib/supabase";

type BookingGeo = {
  id: string;
  lat: number | null;
  lng: number | null;
  status: string;
  service_title: string | null;
  created_at: string;
};

type DistrictBucket = {
  lat: number;
  lng: number;
  label: string;
  count: number;
};

const STATUS_COLORS: Record<string, string> = {
  completed: "#16C47F",
  pending: "#F59E0B",
  cancelled: "#EF4444",
  accepted: "#3B82F6",
  in_progress: "#8B5CF6",
};

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

// Cluster nearby points into district buckets (grid snapping)
function clusterPoints(points: BookingGeo[], gridSize = 0.04): DistrictBucket[] {
  const map: Record<string, { lat: number; lng: number; count: number }> = {};
  for (const p of points) {
    if (p.lat == null || p.lng == null) continue;
    const gLat = Math.round(p.lat / gridSize) * gridSize;
    const gLng = Math.round(p.lng / gridSize) * gridSize;
    const key = `${gLat.toFixed(3)}_${gLng.toFixed(3)}`;
    if (!map[key]) map[key] = { lat: gLat, lng: gLng, count: 0 };
    map[key].count++;
  }
  return Object.entries(map).map(([, v]) => ({
    lat: v.lat,
    lng: v.lng,
    label: `${v.count} طلب`,
    count: v.count,
  }));
}

export default function GeoHeatmap() {
  const [bookings, setBookings] = useState<BookingGeo[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [days, setDays] = useState(30);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const q = supabase
        .from("bookings")
        .select("id, lat:address_lat, lng:address_lng, status, service_title, created_at")
        .gte("created_at", since)
        .not("address_lat", "is", null);
      const { data } = statusFilter === "all" ? await q : await q.eq("status", statusFilter);
      setBookings((data as any[]) || []);
      setLoading(false);
    })();
  }, [days, statusFilter]);

  const clusters = useMemo(() => clusterPoints(bookings), [bookings]);
  const maxCount = useMemo(() => Math.max(...clusters.map((c) => c.count), 1), [clusters]);

  // Stats
  const totalWithGeo = bookings.filter((b) => b.lat != null && b.lng != null).length;
  const covered = bookings.length > 0 ? Math.round((totalWithGeo / bookings.length) * 100) : 0;

  // Center map on Riyadh by default
  const mapCenter: [number, number] = [24.7136, 46.6753];

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🌍 الخريطة الحرارية الجغرافية</h1>
          <p className="text-gray-500 mt-1">كثافة الطلبات حسب المنطقة — يساعد على توزيع المزودين بذكاء</p>
        </div>
        <div className="flex gap-3">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="border rounded-lg px-3 py-2 text-sm bg-white shadow-sm"
          >
            <option value={7}>آخر 7 أيام</option>
            <option value={30}>آخر 30 يوم</option>
            <option value={90}>آخر 90 يوم</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white shadow-sm"
          >
            <option value="all">كل الحالات</option>
            <option value="completed">مكتملة</option>
            <option value="pending">معلقة</option>
            <option value="cancelled">ملغاة</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "إجمالي الطلبات", value: bookings.length, icon: "📍", color: "bg-blue-50 border-blue-200" },
          { label: "لها إحداثيات", value: totalWithGeo, icon: "🗺️", color: "bg-green-50 border-green-200" },
          { label: "تغطية الخريطة", value: `${covered}%`, icon: "📊", color: "bg-purple-50 border-purple-200" },
          { label: "مناطق نشطة", value: clusters.length, icon: "🔴", color: "bg-orange-50 border-orange-200" },
        ].map((k) => (
          <div key={k.label} className={`rounded-2xl border p-4 ${k.color}`}>
            <div className="text-2xl mb-1">{k.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{loading ? "…" : k.value}</div>
            <div className="text-sm text-gray-600">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm text-gray-600 bg-white rounded-2xl p-4 border shadow-sm">
        <span className="font-semibold text-gray-800">دليل الألوان:</span>
        {[
          { color: "#EF4444", label: "منطقة ضعيفة (1-2)" },
          { color: "#F59E0B", label: "منطقة متوسطة (3-9)" },
          { color: "#16C47F", label: "منطقة ساخنة (10+)" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: l.color }} />
            <span>{l.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 mr-auto">
          <div className="w-3 h-3 rounded-full bg-gray-300" />
          <span className="text-xs">حجم الدائرة = كثافة الطلب</span>
        </div>
      </div>

      {/* Map */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ height: 520 }}>
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin text-4xl mb-4">🗺️</div>
              <p className="text-gray-500">جاري تحميل البيانات الجغرافية…</p>
            </div>
          </div>
        ) : (
          <MapContainer center={mapCenter} zoom={11} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {clusters.map((c, i) => {
              const intensity = c.count / maxCount;
              const radius = lerp(8, 48, Math.min(intensity * 1.5, 1));
              const color =
                c.count >= 10 ? "#16C47F" :
                c.count >= 3  ? "#F59E0B" : "#EF4444";
              return (
                <CircleMarker
                  key={i}
                  center={[c.lat, c.lng]}
                  radius={radius}
                  pathOptions={{
                    fillColor: color,
                    fillOpacity: 0.55,
                    color: color,
                    weight: 1.5,
                    opacity: 0.8,
                  }}
                >
                  <Popup>
                    <div dir="rtl" className="text-center">
                      <div className="font-bold text-lg">{c.count} طلب</div>
                      <div className="text-xs text-gray-500">
                        {c.lat.toFixed(3)}, {c.lng.toFixed(3)}
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        )}
      </div>

      {/* Top Areas Table */}
      {clusters.length > 0 && (
        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <h2 className="font-bold text-gray-800 mb-4">🔥 أكثر المناطق طلباً</h2>
          <div className="overflow-auto">
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="border-b text-gray-500 text-xs">
                  <th className="pb-2">#</th>
                  <th className="pb-2">الموقع</th>
                  <th className="pb-2">عدد الطلبات</th>
                  <th className="pb-2">الكثافة</th>
                  <th className="pb-2">المستوى</th>
                </tr>
              </thead>
              <tbody>
                {[...clusters]
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 10)
                  .map((c, i) => {
                    const pct = Math.round((c.count / maxCount) * 100);
                    const level = c.count >= 10 ? "ساخنة 🔴" : c.count >= 3 ? "متوسطة 🟡" : "هادئة 🟢";
                    return (
                      <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-3 font-bold text-gray-400">#{i + 1}</td>
                        <td className="py-3 text-gray-700 font-mono text-xs">
                          {c.lat.toFixed(3)}، {c.lng.toFixed(3)}
                        </td>
                        <td className="py-3 font-bold text-gray-900">{c.count}</td>
                        <td className="py-3 w-32">
                          <div className="bg-gray-100 rounded-full h-2 w-full">
                            <div
                              className="h-2 rounded-full bg-emerald-500 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3">{level}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
