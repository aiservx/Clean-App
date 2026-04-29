import { useEffect, useState } from "react";
import { Card, PageHeader } from "@/components/Layout";
import { supabase } from "@/lib/supabase";

function SettingCard({ keyName, label, hint, schema }: { keyName: string; label: string; hint?: string; schema: { key: string; label: string; type?: string }[] }) {
  const [value, setValue] = useState<any>({});
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", keyName).maybeSingle().then(({ data }) => setValue(data?.value ?? {}));
  }, [keyName]);
  async function save() {
    await supabase.from("app_settings").upsert({ key: keyName, value, updated_at: new Date().toISOString() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }
  return (
    <Card className="p-6 mb-4">
      <h3 className="font-bold text-gray-900 mb-1">{label}</h3>
      {hint && <p className="text-xs text-gray-500 mb-4">{hint}</p>}
      <div className="space-y-3">
        {schema.map((f) => (
          <div key={f.key}>
            <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
            <input
              type={f.type ?? "text"}
              value={value[f.key] ?? ""}
              onChange={(e) => setValue({ ...value, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
            />
          </div>
        ))}
      </div>
      <button onClick={save} className="mt-4 px-5 py-2 rounded-lg bg-emerald-600 text-white font-bold text-sm">
        {saved ? "تم الحفظ ✓" : "حفظ"}
      </button>
    </Card>
  );
}

export function CommissionPage() {
  return (
    <div className="p-8 max-w-2xl">
      <PageHeader title="إعدادات العمولة" subtitle="نسبة العمولة المخصومة من كل حجز" />
      <SettingCard
        keyName="commission"
        label="نسبة العمولة"
        hint="النسبة المئوية التي يحتفظ بها التطبيق من كل عملية"
        schema={[{ key: "percent", label: "النسبة %", type: "number" }]}
      />
    </div>
  );
}

export function BrandingPage() {
  return (
    <div className="p-8 max-w-2xl">
      <PageHeader title="الهوية البصرية" subtitle="خصّص ألوان وشعار التطبيق" />
      <SettingCard
        keyName="app_branding"
        label="هوية التطبيق"
        schema={[
          { key: "name", label: "اسم التطبيق" },
          { key: "primary", label: "اللون الأساسي (Hex)" },
          { key: "logo_url", label: "رابط الشعار" },
        ]}
      />
    </div>
  );
}

export function PoliciesPage() {
  const [value, setValue] = useState<any>({});
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "policies").maybeSingle().then(({ data }) => setValue(data?.value ?? {}));
  }, []);
  async function save() {
    await supabase.from("app_settings").upsert({ key: "policies", value, updated_at: new Date().toISOString() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }
  const docs = [
    { key: "terms", label: "الشروط والأحكام" },
    { key: "privacy", label: "سياسة الخصوصية" },
    { key: "refund", label: "سياسة الاسترداد" },
    { key: "about", label: "عن التطبيق" },
  ];
  return (
    <div className="p-8 max-w-3xl">
      <PageHeader title="السياسات والمستندات" subtitle="نصوص قانونية تظهر في التطبيق" />
      {docs.map((d) => (
        <Card key={d.key} className="p-6 mb-4">
          <label className="block font-bold mb-2">{d.label}</label>
          <textarea
            rows={6}
            value={value[d.key] ?? ""}
            onChange={(e) => setValue({ ...value, [d.key]: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
          />
        </Card>
      ))}
      <button onClick={save} className="px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-bold">
        {saved ? "تم الحفظ ✓" : "حفظ كل التغييرات"}
      </button>
    </div>
  );
}

export function HomeBuilderPage() {
  const [value, setValue] = useState<any>({ sections: [] });
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "home_layout").maybeSingle().then(({ data }) => setValue(data?.value ?? { sections: ["offers","map","services","providers","ai"] }));
  }, []);
  const all = ["offers","map","services","providers","ai","categories","reviews"];
  function toggle(s: string) {
    const arr = value.sections.includes(s) ? value.sections.filter((x: string) => x !== s) : [...value.sections, s];
    setValue({ ...value, sections: arr });
  }
  function move(s: string, dir: -1 | 1) {
    const i = value.sections.indexOf(s);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= value.sections.length) return;
    const arr = [...value.sections];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setValue({ ...value, sections: arr });
  }
  async function save() {
    await supabase.from("app_settings").upsert({ key: "home_layout", value, updated_at: new Date().toISOString() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }
  const labels: Record<string, string> = {
    offers: "🎁 العروض",
    map: "🗺️ الخريطة",
    services: "🧹 الخدمات",
    providers: "👷 مقدمو الخدمة",
    ai: "✨ المساعد الذكي",
    categories: "🗂️ التصنيفات",
    reviews: "⭐ التقييمات",
  };
  return (
    <div className="p-8 max-w-2xl">
      <PageHeader title="بناء الصفحة الرئيسية" subtitle="رتّب الأقسام التي تظهر في الصفحة الرئيسية للتطبيق" />
      <Card className="p-6">
        <div className="text-xs text-gray-500 mb-3">الأقسام المفعّلة (بالترتيب):</div>
        {value.sections.map((s: string, i: number) => (
          <div key={s} className="flex items-center justify-between p-3 mb-2 bg-emerald-50 rounded-lg">
            <span className="font-medium text-gray-900">{i + 1}. {labels[s] || s}</span>
            <div className="flex gap-1">
              <button onClick={() => move(s, -1)} className="px-2 py-1 text-xs bg-white rounded">▲</button>
              <button onClick={() => move(s, 1)} className="px-2 py-1 text-xs bg-white rounded">▼</button>
              <button onClick={() => toggle(s)} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">إخفاء</button>
            </div>
          </div>
        ))}
        <div className="text-xs text-gray-500 mt-4 mb-2">الأقسام المتاحة للإضافة:</div>
        {all.filter(s => !value.sections.includes(s)).map((s) => (
          <div key={s} className="flex items-center justify-between p-3 mb-2 bg-gray-50 rounded-lg">
            <span className="text-gray-600">{labels[s]}</span>
            <button onClick={() => toggle(s)} className="px-3 py-1 text-xs bg-emerald-600 text-white rounded">+ إضافة</button>
          </div>
        ))}
        <button onClick={save} className="mt-4 w-full py-2.5 rounded-lg bg-emerald-600 text-white font-bold">
          {saved ? "تم الحفظ ✓" : "حفظ الترتيب"}
        </button>
      </Card>
    </div>
  );
}

export default function Settings() {
  return (
    <div className="p-8 max-w-2xl">
      <PageHeader title="الإعدادات العامة" />
      <Card className="p-6">
        <div className="text-sm text-gray-600">
          استخدم القائمة على اليمين للوصول إلى:
          <ul className="list-disc list-inside mt-3 space-y-1">
            <li>العمولة</li>
            <li>الهوية والألوان</li>
            <li>السياسات</li>
            <li>بناء الصفحة الرئيسية</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
