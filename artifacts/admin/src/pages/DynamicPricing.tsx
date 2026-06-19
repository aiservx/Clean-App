/**
 * Dynamic Pricing Engine — Admin UI
 * Configure hourly & day-of-week price multipliers.
 * Saved to `app_settings` table → read by mobile app at booking time.
 */
import { useEffect, useState } from "react";
import { Card, PageHeader } from "@/components/Layout";
import { supabase } from "@/lib/supabase";

const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const MULTIPLIER_COLORS: Record<number, { bg: string; text: string; label: string }> = {
  1:   { bg: "#DCFCE7", text: "#16C47F", label: "عادي" },
  125: { bg: "#FEF3C7", text: "#D97706", label: "ارتفاع خفيف" },
  150: { bg: "#FED7AA", text: "#EA580C", label: "ذروة" },
  175: { bg: "#FECACA", text: "#DC2626", label: "ذروة عالية" },
  200: { bg: "#EDE9FE", text: "#7C3AED", label: "ذروة قصوى" },
};

const PRESET_MULTIPLIERS = [1, 1.25, 1.5, 1.75, 2.0];

type PricingGrid = Record<number, Record<number, number>>; // day → hour → multiplier

const DEFAULT_GRID: PricingGrid = {};
for (let d = 0; d < 7; d++) {
  DEFAULT_GRID[d] = {};
  for (let h = 0; h < 24; h++) {
    DEFAULT_GRID[d][h] = 1;
  }
}

// ── Cell component ────────────────────────────────────────────────────────────
function Cell({
  multiplier, selected, onClick,
}: {
  multiplier: number; selected: boolean; onClick: () => void;
}) {
  const key = Math.round(multiplier * 100);
  const style = MULTIPLIER_COLORS[key] ?? MULTIPLIER_COLORS[1];
  return (
    <button
      onClick={onClick}
      title={`${multiplier}× — ${style.label}`}
      style={{
        width: "100%", height: 28, border: selected ? `2px solid ${style.text}` : "1px solid transparent",
        borderRadius: 4, background: style.bg, color: style.text,
        fontSize: 9, fontWeight: 700, cursor: "pointer", transition: "all 0.1s",
        boxShadow: selected ? `0 0 0 2px ${style.text}30` : "none",
      }}
    >
      {multiplier === 1 ? "—" : `${multiplier}×`}
    </button>
  );
}

// ── Day multiplier quick-set ──────────────────────────────────────────────────
function DayQuickSet({ day, grid, onChange }: { day: number; grid: PricingGrid; onChange: (d: number, h: number, v: number) => void }) {
  const avg = Object.values(grid[day] ?? {}).reduce((s, v) => s + v, 0) / 24;
  return (
    <button
      onClick={() => {
        const next = avg > 1.1 ? 1 : 1.25;
        HOURS.forEach((h) => onChange(day, h, next));
      }}
      style={{ fontSize: 10, color: "#7C3AED", fontFamily: "Tajawal, sans-serif", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
    >
      {avg > 1.1 ? "إعادة تعيين" : "+25%"}
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DynamicPricing() {
  const [grid, setGrid] = useState<PricingGrid>(DEFAULT_GRID);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedMultiplier, setSelectedMultiplier] = useState(1.5);
  const [enabled, setEnabled] = useState(false);
  const [baseHike, setBaseHike] = useState(false);

  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "dynamic_pricing").maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          setGrid(data.value.grid ?? DEFAULT_GRID);
          setEnabled(data.value.enabled ?? false);
          setBaseHike(data.value.base_hike ?? false);
        }
        setLoading(false);
      });
  }, []);

  function setCell(day: number, hour: number, val: number) {
    setGrid((prev) => ({ ...prev, [day]: { ...prev[day], [hour]: val } }));
  }

  async function save() {
    setSaving(true);
    await supabase.from("app_settings").upsert({
      key: "dynamic_pricing",
      value: { grid, enabled, base_hike: baseHike, updated_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function applyPeakPreset() {
    const newGrid: PricingGrid = {};
    for (let d = 0; d < 7; d++) {
      newGrid[d] = {};
      for (let h = 0; h < 24; h++) {
        // Weekends (Thu/Fri in Saudi = 4/5) + morning/evening peaks
        const isWeekend = d === 4 || d === 5;
        const isMorningPeak = h >= 8 && h <= 11;
        const isEveningPeak = h >= 17 && h <= 21;
        const isLateNight = h >= 22 || h <= 5;
        if (isLateNight) newGrid[d][h] = 1;
        else if (isWeekend && (isMorningPeak || isEveningPeak)) newGrid[d][h] = 1.75;
        else if (isWeekend) newGrid[d][h] = 1.5;
        else if (isMorningPeak || isEveningPeak) newGrid[d][h] = 1.5;
        else newGrid[d][h] = 1.25;
      }
    }
    setGrid(newGrid);
  }

  function resetGrid() {
    const fresh: PricingGrid = {};
    for (let d = 0; d < 7; d++) { fresh[d] = {}; for (let h = 0; h < 24; h++) fresh[d][h] = 1; }
    setGrid(fresh);
  }

  // Stats
  const allVals = Object.values(grid).flatMap((dg) => Object.values(dg));
  const avgMult = allVals.reduce((s, v) => s + v, 0) / allVals.length;
  const peakCells = allVals.filter((v) => v >= 1.5).length;
  const maxMult = Math.max(...allVals);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-24">
        <div className="text-gray-400" style={{ fontFamily: "Tajawal, sans-serif" }}>جاري التحميل…</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl" dir="rtl">
      <PageHeader
        title="⚡ محرك التسعير الديناميكي"
        subtitle="ضبط ضاربات السعر حسب الأوقات وأيام الأسبوع لتعظيم الإيرادات"
        action={
          <div className="flex items-center gap-2">
            <button onClick={applyPeakPreset} style={{ padding: "8px 16px", borderRadius: 10, background: "#EDE9FE", color: "#7C3AED", fontFamily: "Tajawal, sans-serif", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer" }}>
              🎯 إعداد الذروة التلقائي
            </button>
            <button onClick={resetGrid} style={{ padding: "8px 16px", borderRadius: 10, background: "#F1F5F9", color: "#64748B", fontFamily: "Tajawal, sans-serif", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer" }}>
              🔄 إعادة تعيين
            </button>
            <button
              onClick={save}
              disabled={saving}
              style={{
                padding: "8px 20px", borderRadius: 10, border: "none", cursor: saving ? "wait" : "pointer",
                background: saved ? "#DCFCE7" : "linear-gradient(135deg,#16C47F,#0FA868)",
                color: saved ? "#16C47F" : "#FFF",
                fontFamily: "Tajawal, sans-serif", fontSize: 13, fontWeight: 700,
              }}
            >
              {saving ? "جاري الحفظ…" : saved ? "تم الحفظ ✓" : "💾 حفظ الإعدادات"}
            </button>
          </div>
        }
      />

      {/* ── Toggle + Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Enable toggle */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-sm text-gray-800" style={{ fontFamily: "Tajawal, sans-serif" }}>تفعيل التسعير الديناميكي</span>
            <button
              onClick={() => setEnabled(!enabled)}
              style={{ width: 44, height: 24, borderRadius: 12, background: enabled ? "#16C47F" : "#D1D5DB", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s" }}
            >
              <span style={{ position: "absolute", top: 3, width: 18, height: 18, borderRadius: "50%", background: "#FFF", transition: "left 0.2s", left: enabled ? "calc(100% - 21px)" : 3 }} />
            </button>
          </div>
          <p style={{ fontSize: 11, color: "#64748B", fontFamily: "Tajawal, sans-serif" }}>
            {enabled ? "✅ نشط — الأسعار تتغير حسب الجدول" : "⏸ معطّل — سعر ثابت للجميع"}
          </p>
        </Card>

        <Card className="p-4">
          <div className="font-bold text-2xl mb-1" style={{ color: "#7C3AED" }}>{peakCells}</div>
          <div style={{ fontSize: 12, color: "#64748B", fontFamily: "Tajawal, sans-serif" }}>خانة ذروة (≥ 1.5×)</div>
        </Card>

        <Card className="p-4">
          <div className="font-bold text-2xl mb-1" style={{ color: "#F59E0B" }}>{avgMult.toFixed(2)}×</div>
          <div style={{ fontSize: 12, color: "#64748B", fontFamily: "Tajawal, sans-serif" }}>متوسط الضاريب الأسبوعي</div>
        </Card>

        <Card className="p-4">
          <div className="font-bold text-2xl mb-1" style={{ color: "#EF4444" }}>{maxMult}×</div>
          <div style={{ fontSize: 12, color: "#64748B", fontFamily: "Tajawal, sans-serif" }}>أقصى ضاريب مضبوط</div>
        </Card>
      </div>

      {/* ── Multiplier Selector ── */}
      <Card className="p-5 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-bold text-sm text-gray-700" style={{ fontFamily: "Tajawal, sans-serif" }}>ضاريب الرسم (انقر خانة في الجدول لتطبيقه):</span>
          {PRESET_MULTIPLIERS.map((m) => {
            const key = Math.round(m * 100);
            const style = MULTIPLIER_COLORS[key] ?? MULTIPLIER_COLORS[1];
            return (
              <button
                key={m}
                onClick={() => setSelectedMultiplier(m)}
                style={{
                  padding: "6px 16px", borderRadius: 20, border: selectedMultiplier === m ? `2px solid ${style.text}` : "2px solid transparent",
                  background: style.bg, color: style.text, fontWeight: 700, fontSize: 13, cursor: "pointer",
                  boxShadow: selectedMultiplier === m ? `0 0 0 3px ${style.text}20` : "none",
                  transition: "all 0.15s",
                }}
              >
                {m === 1 ? "عادي (1×)" : `${m}× — ${style.label}`}
              </button>
            );
          })}
          <span style={{ fontSize: 11, color: "#94A3B8", fontFamily: "Tajawal, sans-serif", marginRight: "auto" }}>
            انقر خانة لتطبيق الضاريب المحدد • اسحب للتطبيق على نطاق
          </span>
        </div>
      </Card>

      {/* ── Pricing Grid ── */}
      <Card className="p-0 overflow-hidden mb-4">
        <div className="p-4 pb-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <h3 className="font-bold text-gray-900" style={{ fontFamily: "Tajawal, sans-serif" }}>الجدول الزمني (يوم × ساعة)</h3>
          <p style={{ fontSize: 11, color: "#64748B", fontFamily: "Tajawal, sans-serif", marginTop: 2 }}>اللون الأخضر = عادي | الأصفر = ارتفاع | البرتقالي = ذروة | الأحمر = ذروة عالية</p>
        </div>
        <div style={{ overflowX: "auto", padding: "12px 16px" }}>
          {/* Hours header */}
          <div style={{ display: "grid", gridTemplateColumns: "80px repeat(24, 1fr)", gap: 2, marginBottom: 4, minWidth: 900 }}>
            <div />
            {HOURS.map((h) => (
              <div key={h} style={{ textAlign: "center", fontSize: 9, color: "#94A3B8", fontWeight: 700 }}>
                {h < 10 ? `0${h}` : h}
              </div>
            ))}
          </div>
          {/* Day rows */}
          {DAYS.map((day, d) => (
            <div key={d} style={{ display: "grid", gridTemplateColumns: "80px repeat(24, 1fr)", gap: 2, marginBottom: 2, minWidth: 900 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                <span style={{ fontSize: 11, color: "#374151", fontFamily: "Tajawal, sans-serif", fontWeight: 700, whiteSpace: "nowrap" }}>{day}</span>
                <DayQuickSet day={d} grid={grid} onChange={setCell} />
              </div>
              {HOURS.map((h) => (
                <Cell
                  key={h}
                  multiplier={grid[d]?.[h] ?? 1}
                  selected={false}
                  onClick={() => setCell(d, h, selectedMultiplier)}
                />
              ))}
            </div>
          ))}
        </div>
      </Card>

      {/* ── Legend + Tips ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h4 className="font-bold text-gray-900 mb-3 text-sm" style={{ fontFamily: "Tajawal, sans-serif" }}>🗝 دليل الألوان</h4>
          <div className="space-y-2">
            {Object.entries(MULTIPLIER_COLORS).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <span className="w-8 h-5 rounded" style={{ background: v.bg, display: "inline-block" }} />
                <span style={{ fontSize: 12, color: "#374151", fontFamily: "Tajawal, sans-serif" }}>
                  {k === "1" ? "1×" : `${Number(k) / 100}×`} — {v.label}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h4 className="font-bold text-gray-900 mb-3 text-sm" style={{ fontFamily: "Tajawal, sans-serif" }}>💡 نصائح التسعير</h4>
          <ul className="space-y-2 text-xs text-gray-600" style={{ fontFamily: "Tajawal, sans-serif" }}>
            <li>🕗 <strong>الذروة الصباحية</strong> (8-11ص): أعلى طلب — اضبط 1.5×</li>
            <li>🌙 <strong>الذروة المسائية</strong> (5-9م): اضبط 1.5-1.75×</li>
            <li>📅 <strong>نهاية الأسبوع</strong> (الخميس-الجمعة): اضبط 1.75×</li>
            <li>🌃 <strong>الفترة الليلية</strong> (10م-6ص): اضبط 1× (لا رفع)</li>
            <li>📊 اضغط <strong>"إعداد الذروة التلقائي"</strong> للبدء السريع</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
