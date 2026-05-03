import { useEffect, useState } from "react";
import { Card, PageHeader } from "@/components/Layout";
import { supabase } from "@/lib/supabase";

const PROJECT_ID = "dd03c810-2182-47e7-9a0a-823fdcc351b8";
const ACCOUNT = "clean-beaton";
const PROJECT_SLUG = "mobile";

type OTAConfig = {
  force_update: boolean;
  min_version: string;
  update_message: string;
  channel: string;
};

type UpdateLog = {
  id: string;
  message: string;
  channel: string;
  version: string;
  pushed_at: string;
  pushed_by: string;
};

const DEFAULT_CONFIG: OTAConfig = {
  force_update: false,
  min_version: "1.0.0",
  update_message: "يتوفر تحديث جديد لتطبيق نظافة. أعد التشغيل للحصول على أحدث الميزات.",
  channel: "preview",
};

// ── Config card ────────────────────────────────────────────────────────────
function ConfigSection() {
  const [cfg, setCfg] = useState<OTAConfig>(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "ota_config")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setCfg({ ...DEFAULT_CONFIG, ...data.value });
        setLoading(false);
      });
  }, []);

  async function save() {
    await supabase
      .from("app_settings")
      .upsert({ key: "ota_config", value: cfg, updated_at: new Date().toISOString() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return <Card className="p-6 mb-4"><div className="text-gray-400 text-sm">جاري التحميل…</div></Card>;

  return (
    <Card className="p-6 mb-4">
      <h3 className="font-bold text-gray-900 mb-1" style={{ fontFamily: "Tajawal,sans-serif" }}>إعدادات نظام التحديث</h3>
      <p className="text-xs text-gray-500 mb-5">تُقرأ هذه الإعدادات من التطبيق عند الفتح لتحديد طريقة عرض التحديثات للمستخدمين</p>

      <div className="space-y-4">
        {/* Force update toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "#F8FAFC" }}>
          <div>
            <div className="font-medium text-sm text-gray-800">إجبار المستخدمين على التحديث</div>
            <div className="text-xs text-gray-500 mt-0.5">عند التفعيل: يُمنع المستخدمون من استخدام التطبيق حتى يُحدِّثوه</div>
          </div>
          <button
            onClick={() => setCfg({ ...cfg, force_update: !cfg.force_update })}
            className="relative w-12 h-6 rounded-full transition-colors"
            style={{ background: cfg.force_update ? "var(--color-primary)" : "#D1D5DB" }}
          >
            <span
              className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
              style={{ left: cfg.force_update ? "calc(100% - 20px)" : "4px" }}
            />
          </button>
        </div>

        {/* Min version */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">الحد الأدنى للإصدار المقبول</label>
          <input
            value={cfg.min_version}
            onChange={(e) => setCfg({ ...cfg, min_version: e.target.value })}
            placeholder="1.0.0"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">المستخدمون الذين لديهم إصدار أقدم سيُطلب منهم التحديث</p>
        </div>

        {/* Update message */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">رسالة التحديث (تظهر للمستخدم)</label>
          <textarea
            value={cfg.update_message}
            onChange={(e) => setCfg({ ...cfg, update_message: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none"
          />
        </div>

        {/* Channel */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">القناة الافتراضية</label>
          <select
            value={cfg.channel}
            onChange={(e) => setCfg({ ...cfg, channel: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
          >
            <option value="preview">preview — اختبار داخلي</option>
            <option value="production">production — نشر عام</option>
          </select>
        </div>
      </div>

      <button
        onClick={save}
        className="mt-5 px-6 py-2 rounded-lg text-white font-bold text-sm transition-opacity hover:opacity-90"
        style={{ background: "var(--color-primary)", fontFamily: "Tajawal,sans-serif" }}
      >
        {saved ? "تم الحفظ ✓" : "حفظ الإعدادات"}
      </button>
    </Card>
  );
}

// ── Deploy command card ────────────────────────────────────────────────────
function DeploySection({ onLog }: { onLog: (log: Omit<UpdateLog, "id">) => void }) {
  const [msg, setMsg] = useState("");
  const [channel, setChannel] = useState("preview");
  const [version, setVersion] = useState("1.0.0");
  const [copied, setCopied] = useState(false);
  const [logged, setLogged] = useState(false);
  const { profile } = useSimpleAuth();

  const command = `EAS_NO_VCS=1 EAS_SKIP_AUTO_FINGERPRINT=1 pnpm exec eas update --channel ${channel} --message "${msg || "وصف التحديث"}"`;

  function copy() {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function logUpdate() {
    if (!msg) return;
    const entry: Omit<UpdateLog, "id"> = {
      message: msg,
      channel,
      version,
      pushed_at: new Date().toISOString(),
      pushed_by: profile?.full_name || "مدير",
    };
    onLog(entry);
    setLogged(true);
    setTimeout(() => { setLogged(false); setMsg(""); }, 2500);
  }

  return (
    <Card className="p-6 mb-4">
      <h3 className="font-bold text-gray-900 mb-1" style={{ fontFamily: "Tajawal,sans-serif" }}>إصدار تحديث جديد (OTA)</h3>
      <p className="text-xs text-gray-500 mb-5">التحديثات الفورية لا تتطلب إعادة بناء APK — فقط تغييرات JavaScript والواجهات</p>

      <div className="space-y-3 mb-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">القناة</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm">
              <option value="preview">preview</option>
              <option value="production">production</option>
            </select>
          </div>
          <div className="w-32">
            <label className="block text-xs font-medium text-gray-600 mb-1">الإصدار</label>
            <input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.1" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">وصف التحديث (يُستخدم في الأمر)</label>
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="مثال: إصلاح خطأ في شاشة الحجز"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
          />
        </div>
      </div>

      {/* Command box */}
      <div className="rounded-xl p-4 mb-4" style={{ background: "#0F172A" }}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-xs font-mono" style={{ color: "#94A3B8" }}>أمر نشر التحديث (شغّله في terminal)</span>
          <button
            onClick={copy}
            className="text-xs px-3 py-1 rounded-lg font-medium transition-all"
            style={{ background: copied ? "#16C47F" : "#1E293B", color: copied ? "#fff" : "#94A3B8" }}
          >
            {copied ? "تم النسخ ✓" : "نسخ"}
          </button>
        </div>
        <code className="text-xs break-all" style={{ color: "#7DD3A8", fontFamily: "monospace" }}>{command}</code>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={logUpdate}
          disabled={!msg}
          className="px-5 py-2 rounded-lg text-white font-bold text-sm disabled:opacity-40 transition-opacity hover:opacity-90"
          style={{ background: "#7C3AED", fontFamily: "Tajawal,sans-serif" }}
        >
          {logged ? "تم التسجيل ✓" : "تسجيل التحديث في السجل"}
        </button>
        <span className="text-xs text-gray-400">بعد تشغيل الأمر، سجّل التحديث هنا لحفظه في السجل</span>
      </div>
    </Card>
  );
}

// ── Update history ─────────────────────────────────────────────────────────
function HistorySection({ logs, onDelete }: { logs: UpdateLog[]; onDelete: (id: string) => void }) {
  if (logs.length === 0) {
    return (
      <Card className="p-6 mb-4">
        <h3 className="font-bold text-gray-900 mb-4" style={{ fontFamily: "Tajawal,sans-serif" }}>سجل التحديثات</h3>
        <div className="text-center py-8 text-gray-400 text-sm">لا يوجد سجل تحديثات بعد. أصدر تحديثاً أولاً.</div>
      </Card>
    );
  }

  return (
    <Card className="p-6 mb-4">
      <h3 className="font-bold text-gray-900 mb-4" style={{ fontFamily: "Tajawal,sans-serif" }}>سجل التحديثات ({logs.length})</h3>
      <div className="space-y-3">
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "#F8FAFC" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0" style={{ background: log.channel === "production" ? "#FEF3C7" : "#EDE9FE" }}>
              {log.channel === "production" ? "🚀" : "🧪"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm text-gray-900">{log.message}</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: log.channel === "production" ? "#FEF3C7" : "#EDE9FE", color: log.channel === "production" ? "#92400E" : "#5B21B6" }}>
                  {log.channel}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#F1F5F9", color: "#64748B" }}>
                  v{log.version}
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {new Date(log.pushed_at).toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" })} — {log.pushed_by}
              </div>
            </div>
            <button onClick={() => onDelete(log.id)} className="text-gray-300 hover:text-red-400 text-lg flex-shrink-0 transition-colors">×</button>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Channel status cards ───────────────────────────────────────────────────
function ChannelCards() {
  const channels = [
    {
      name: "preview",
      label: "Preview",
      emoji: "🧪",
      desc: "للاختبار الداخلي والمطورين",
      color: "#7C3AED",
      bg: "#EDE9FE",
      link: `https://expo.dev/accounts/${ACCOUNT}/projects/${PROJECT_SLUG}/updates`,
    },
    {
      name: "production",
      label: "Production",
      emoji: "🚀",
      desc: "للمستخدمين العامين (Google Play)",
      color: "#D97706",
      bg: "#FEF3C7",
      link: `https://expo.dev/accounts/${ACCOUNT}/projects/${PROJECT_SLUG}/updates`,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 mb-4">
      {channels.map((ch) => (
        <Card key={ch.name} className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">{ch.emoji}</span>
            <div>
              <div className="font-bold text-gray-900 text-sm" style={{ fontFamily: "Tajawal,sans-serif" }}>قناة {ch.label}</div>
              <div className="text-xs text-gray-500">{ch.desc}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full" style={{ background: ch.color }} />
            <span className="text-xs font-medium" style={{ color: ch.color }}>نشطة</span>
          </div>
          <a
            href={ch.link}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium underline"
            style={{ color: ch.color }}
          >
            عرض التحديثات على expo.dev ↗
          </a>
        </Card>
      ))}
    </div>
  );
}

// ── Info card ──────────────────────────────────────────────────────────────
function InfoCard() {
  return (
    <div className="rounded-lg p-5 mb-4 border-none" style={{ background: "linear-gradient(135deg,#EDE9FE,#F5F3FF)" }}>
      <div className="flex gap-3 items-start">
        <span className="text-2xl">💡</span>
        <div>
          <div className="font-bold text-purple-900 mb-1 text-sm" style={{ fontFamily: "Tajawal,sans-serif" }}>كيف يعمل نظام OTA؟</div>
          <ul className="text-xs text-purple-800 space-y-1 list-disc list-inside">
            <li>التطبيق يتحقق تلقائياً من وجود تحديث عند كل فتح</li>
            <li>إذا وُجد تحديث، يُنزَّل في الخلفية ثم يُعرض على المستخدم اختيار التحديث</li>
            <li>التحديثات تعمل فقط على تغييرات JavaScript — تغييرات المكتبات الأصلية تتطلب بناء APK جديد</li>
            <li>Project ID: <code className="bg-white/60 px-1 rounded" style={{ fontSize: 11 }}>{PROJECT_ID}</code></li>
            <li>الحساب: <code className="bg-white/60 px-1 rounded" style={{ fontSize: 11 }}>{ACCOUNT}</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ── Simple auth hook (reads from existing AuthProvider) ───────────────────
function useSimpleAuth() {
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase.from("profiles").select("full_name").eq("id", data.user.id).maybeSingle()
          .then(({ data: p }) => setProfile(p));
      }
    });
  }, []);
  return { profile };
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function OTAUpdates() {
  const [logs, setLogs] = useState<UpdateLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "ota_history")
      .maybeSingle()
      .then(({ data }) => {
        if (Array.isArray(data?.value)) setLogs(data.value);
        setLogsLoading(false);
      });
  }, []);

  async function addLog(entry: Omit<UpdateLog, "id">) {
    const newLog: UpdateLog = { ...entry, id: Date.now().toString() };
    const updated = [newLog, ...logs];
    setLogs(updated);
    await supabase.from("app_settings").upsert({
      key: "ota_history",
      value: updated,
      updated_at: new Date().toISOString(),
    });
  }

  async function deleteLog(id: string) {
    const updated = logs.filter((l) => l.id !== id);
    setLogs(updated);
    await supabase.from("app_settings").upsert({
      key: "ota_history",
      value: updated,
      updated_at: new Date().toISOString(),
    });
  }

  return (
    <div className="p-8 max-w-3xl">
      <PageHeader
        title="التحديثات الفورية (OTA)"
        subtitle="أدر تحديثات التطبيق عن بُعد دون إعادة بناء APK"
        action={
          <a
            href={`https://expo.dev/accounts/${ACCOUNT}/projects/${PROJECT_SLUG}/updates`}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
            style={{ background: "var(--color-primary-light)", color: "var(--color-primary)", fontFamily: "Tajawal,sans-serif" }}
          >
            Expo Dashboard ↗
          </a>
        }
      />

      <InfoCard />
      <ChannelCards />
      <ConfigSection />
      <DeploySection onLog={addLog} />
      {!logsLoading && <HistorySection logs={logs} onDelete={deleteLog} />}
    </div>
  );
}
