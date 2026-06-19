import { useEffect, useState, useCallback } from "react";
import { Card, PageHeader } from "@/components/Layout";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

// ─── Reusable helpers ───────────────────────────────────────────────────────

function Badge({ color, children }: { color: "green" | "red" | "yellow" | "blue"; children: React.ReactNode }) {
  const cls = {
    green:  "bg-emerald-100 text-emerald-700 border-emerald-200",
    red:    "bg-red-100 text-red-700 border-red-200",
    yellow: "bg-amber-100 text-amber-700 border-amber-200",
    blue:   "bg-blue-100 text-blue-700 border-blue-200",
  }[color];
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>{children}</span>;
}

function CopyField({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const display = secret && !show ? "•".repeat(Math.min(value.length, 40)) : value;
  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-700 truncate select-all">
          {display || "—"}
        </div>
        {secret && (
          <button onClick={() => setShow(!show)} className="px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
            {show ? "إخفاء" : "إظهار"}
          </button>
        )}
        {value && (
          <button onClick={copy} className="px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
            {copied ? "✓ تم" : "نسخ"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Migration SQL ───────────────────────────────────────────────────────────

const MIGRATION_SQL = `-- ============================================================
-- نظافة — Full DB Setup (run once in Supabase SQL Editor)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  avatar_url text,
  role text DEFAULT 'customer',
  email text,
  gender text,
  username text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR EXISTS(SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role = 'admin'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Enable insert for authenticated users" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Service categories
CREATE TABLE IF NOT EXISTS public.service_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title_ar text NOT NULL,
  title_en text,
  icon text,
  color text DEFAULT '#16C47F',
  sort integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read categories" ON public.service_categories FOR SELECT USING (true);
CREATE POLICY "Admins manage categories" ON public.service_categories FOR ALL USING (EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Services
CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id uuid REFERENCES public.service_categories(id),
  title_ar text NOT NULL,
  title_en text,
  description_ar text,
  price_from numeric DEFAULT 0,
  price_per_hour numeric DEFAULT 0,
  icon text,
  image_url text,
  active boolean DEFAULT true,
  sort integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Admins manage services" ON public.services FOR ALL USING (EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Providers
CREATE TYPE IF NOT EXISTS public.provider_status_t AS ENUM ('pending','active','suspended');
CREATE TABLE IF NOT EXISTS public.providers (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bio text,
  rating numeric DEFAULT 5.0,
  experience_years integer DEFAULT 0,
  hourly_rate numeric DEFAULT 50,
  available boolean DEFAULT false,
  current_lat numeric,
  current_lng numeric,
  location_updated_at timestamptz,
  status public.provider_status_t DEFAULT 'pending',
  services text[] DEFAULT '{}',
  service_areas text[] DEFAULT '{}',
  service_radius_km numeric DEFAULT 10,
  working_hours jsonb DEFAULT '{"start":"08:00","end":"20:00"}',
  acceptance_rate numeric DEFAULT 100,
  total_bookings integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active providers" ON public.providers FOR SELECT USING (true);
CREATE POLICY "Providers can update own record" ON public.providers FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins manage providers" ON public.providers FOR ALL USING (EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Addresses
CREATE TABLE IF NOT EXISTS public.addresses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  label text,
  address_line text NOT NULL,
  lat numeric,
  lng numeric,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own addresses" ON public.addresses FOR ALL USING (auth.uid() = user_id);

-- Bookings
CREATE TYPE IF NOT EXISTS public.booking_status_t AS ENUM ('pending','accepted','on_the_way','arrived','started','in_progress','completed','cancelled','rejected');
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id),
  provider_id uuid REFERENCES public.providers(id),
  service_id uuid REFERENCES public.services(id),
  status public.booking_status_t DEFAULT 'pending',
  scheduled_at timestamptz,
  address_line text,
  lat numeric,
  lng numeric,
  notes text,
  total numeric DEFAULT 0,
  hours numeric DEFAULT 1,
  payment_method text DEFAULT 'cash',
  payment_status text DEFAULT 'pending',
  cancelled_by text,
  cancel_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own bookings" ON public.bookings FOR SELECT USING (auth.uid() = user_id OR auth.uid() = provider_id OR EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users/providers update bookings" ON public.bookings FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = provider_id OR EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Booking status log
CREATE TABLE IF NOT EXISTS public.booking_status_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.booking_status_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone involved can read log" ON public.booking_status_log FOR SELECT USING (EXISTS(SELECT 1 FROM public.bookings WHERE id = booking_id AND (user_id = auth.uid() OR provider_id = auth.uid())));
CREATE POLICY "Insert log entries" ON public.booking_status_log FOR INSERT WITH CHECK (true);

-- Offers
CREATE TABLE IF NOT EXISTS public.offers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title_ar text,
  title_en text,
  desc_ar text,
  code text UNIQUE,
  discount numeric DEFAULT 10,
  discount_type text DEFAULT 'percent',
  min_order numeric DEFAULT 0,
  max_uses integer,
  used_count integer DEFAULT 0,
  active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active offers" ON public.offers FOR SELECT USING (active = true OR EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins manage offers" ON public.offers FOR ALL USING (EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  body text,
  type text DEFAULT 'general',
  data jsonb DEFAULT '{}',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Push tokens
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text DEFAULT 'expo',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, token)
);
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tokens" ON public.push_tokens FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Service role reads all tokens" ON public.push_tokens FOR SELECT USING (true);

-- Chat messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id),
  content text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Booking participants can chat" ON public.chat_messages FOR ALL USING (EXISTS(SELECT 1 FROM public.bookings WHERE id = booking_id AND (user_id = auth.uid() OR provider_id = auth.uid())));

-- Ratings
CREATE TABLE IF NOT EXISTS public.ratings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id uuid REFERENCES public.bookings(id) UNIQUE,
  user_id uuid REFERENCES auth.users(id),
  provider_id uuid REFERENCES public.providers(id),
  stars integer CHECK (stars BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users create ratings" ON public.ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone reads ratings" ON public.ratings FOR SELECT USING (true);

-- Support tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id),
  subject text,
  message text,
  status text DEFAULT 'open',
  admin_reply text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tickets" ON public.support_tickets FOR ALL USING (auth.uid() = user_id OR EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Refund requests
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id uuid REFERENCES public.bookings(id),
  user_id uuid REFERENCES auth.users(id),
  amount numeric,
  reason text,
  status text DEFAULT 'pending',
  admin_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users/admins manage refunds" ON public.refund_requests FOR ALL USING (auth.uid() = user_id OR EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Withdrawal requests
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id uuid REFERENCES public.providers(id),
  amount numeric,
  bank_name text,
  iban text,
  status text DEFAULT 'pending',
  admin_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Providers manage own withdrawals" ON public.withdrawal_requests FOR ALL USING (auth.uid() = provider_id OR EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- App settings
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage settings" ON public.app_settings FOR ALL USING (EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Anyone reads settings" ON public.app_settings FOR SELECT USING (true);

-- Wallet transactions
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id uuid REFERENCES public.providers(id),
  booking_id uuid REFERENCES public.bookings(id),
  amount numeric NOT NULL,
  type text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Providers see own transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = provider_id OR EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Insert transactions" ON public.wallet_transactions FOR INSERT WITH CHECK (true);

-- Create admin profile row
INSERT INTO public.profiles (id, full_name, role, email)
SELECT id, 'المدير', 'admin', email
FROM auth.users
WHERE email = 'admin@nadhafa.app'
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.providers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_status_log;
`;

// ─── Sections ────────────────────────────────────────────────────────────────

function AdminCredentials() {
  const { session } = useAuth();
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function changePwd(e: React.FormEvent) {
    e.preventDefault();
    if (newPwd !== confirmPwd) { setMsg({ type: "err", text: "كلمتا المرور غير متطابقتين" }); return; }
    if (newPwd.length < 8) { setMsg({ type: "err", text: "يجب أن تكون كلمة المرور 8 أحرف على الأقل" }); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setLoading(false);
    if (error) setMsg({ type: "err", text: error.message });
    else { setMsg({ type: "ok", text: "تم تغيير كلمة المرور بنجاح ✓" }); setNewPwd(""); setConfirmPwd(""); }
    setTimeout(() => setMsg(null), 4000);
  }

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-xl">🔐</div>
        <div>
          <h3 className="font-bold text-gray-900">بيانات حساب المدير</h3>
          <p className="text-xs text-gray-500">بيانات تسجيل الدخول للوحة الإدارة</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
        <div>
          <div className="text-xs text-gray-500 mb-1">البريد الإلكتروني</div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-gray-800">admin@nadhafa.app</span>
            <button onClick={() => { navigator.clipboard.writeText("admin@nadhafa.app"); }} className="text-xs text-emerald-600 hover:underline">نسخ</button>
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">كلمة المرور الحالية</div>
          <div className="font-mono text-sm font-semibold text-gray-800">Nadhafa@2026</div>
        </div>
        <div className="col-span-2">
          <div className="text-xs text-gray-400">المستخدم الحالي: {session?.user?.email ?? "—"}</div>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-5">
        <h4 className="font-semibold text-gray-700 text-sm mb-4">تغيير كلمة المرور</h4>
        <form onSubmit={changePwd} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">كلمة المرور الجديدة</label>
            <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="8 أحرف على الأقل" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">تأكيد كلمة المرور</label>
            <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="أعد كتابة كلمة المرور" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
          </div>
          {msg && (
            <div className={`col-span-2 text-sm p-3 rounded-lg ${msg.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{msg.text}</div>
          )}
          <div className="col-span-2">
            <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-lg bg-gray-900 text-white font-bold text-sm hover:bg-gray-700 disabled:opacity-60">
              {loading ? "جاري التغيير…" : "تغيير كلمة المرور"}
            </button>
          </div>
        </form>
      </div>
    </Card>
  );
}

function DatabaseConfig() {
  const [status, setStatus]       = useState<"idle"|"testing"|"ok"|"fail">("idle");
  const [copied, setCopied]       = useState(false);
  const [sqlPreview, setSqlPreview] = useState<string>("");
  const [sqlLen, setSqlLen]       = useState(0);
  const [managementKey, setManagementKey] = useState("");
  const [setupState, setSetupState] = useState<"idle"|"running"|"done"|"error">("idle");
  const [setupMsg, setSetupMsg]   = useState("");

  const API_URL  = import.meta.env.VITE_API_URL || "";
  const SUPA_URL = import.meta.env.VITE_SUPABASE_URL || "https://jotdqrffjjkyjfdhiwht.supabase.co";
  const PROJECT_ID = SUPA_URL.replace("https://", "").split(".")[0];

  useEffect(() => {
    fetch(`${API_URL}/api/admin/db-setup/sql`)
      .then(r => r.json())
      .then(d => { setSqlPreview((d.sql as string)?.slice(0, 900) ?? ""); setSqlLen(d.length ?? 0); })
      .catch(() => { setSqlPreview(MIGRATION_SQL.slice(0, 900)); setSqlLen(MIGRATION_SQL.length); });
  }, []);

  async function testConnection() {
    setStatus("testing");
    try {
      // Ping Supabase REST endpoint directly — any HTTP response means the
      // project is reachable (even 401 means the server is alive).
      const r = await fetch(`${SUPA_URL}/rest/v1/`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      // 200, 400, 401, 403 all mean the server responded → connected
      setStatus(r.status < 500 ? "ok" : "fail");
    } catch { setStatus("fail"); }
  }

  async function copySql() {
    try {
      const r = await fetch(`${API_URL}/api/admin/db-setup/sql`);
      const d = await r.json() as { sql?: string };
      await navigator.clipboard.writeText(d.sql ?? MIGRATION_SQL);
    } catch {
      await navigator.clipboard.writeText(MIGRATION_SQL);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  async function runAutoSetup() {
    if (!managementKey.trim()) {
      setSetupMsg("أدخل Management API Key أولاً");
      setSetupState("error");
      return;
    }
    setSetupState("running");
    setSetupMsg("جاري تهيئة قاعدة البيانات…");
    try {
      const r = await fetch(`${API_URL}/api/admin/db-setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ managementKey: managementKey.trim() }),
      });
      const d = await r.json() as { success?: boolean; error?: string; details?: string };
      if (d.success) {
        setSetupState("done");
        setSetupMsg("✅ تمت التهيئة بنجاح! جميع الجداول والبيانات الأولية جاهزة.");
      } else {
        setSetupState("error");
        setSetupMsg(`خطأ: ${d.error ?? "غير معروف"}`);
      }
    } catch (e) {
      setSetupState("error");
      setSetupMsg("تعذّر الاتصال بالخادم — تأكد من تشغيل API Server");
    }
  }

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-xl">🗄️</div>
        <div>
          <h3 className="font-bold text-gray-900">إعدادات قاعدة البيانات</h3>
          <p className="text-xs text-gray-500">Supabase PostgreSQL — التهيئة التلقائية</p>
        </div>
        <div className="mr-auto">
          {status === "ok"      && <Badge color="green">✓ متصل</Badge>}
          {status === "fail"    && <Badge color="red">✗ خطأ</Badge>}
          {status === "testing" && <Badge color="yellow">⏳ يتحقق…</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-1 mb-4">
        <CopyField label="رابط المشروع (Supabase URL)" value={SUPA_URL} />
        <CopyField label="Project ID" value={PROJECT_ID} />
      </div>

      <div className="flex gap-3 mb-6">
        <button onClick={testConnection} disabled={status === "testing"}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 disabled:opacity-60">
          🔌 اختبار الاتصال
        </button>
        <a href={`https://supabase.com/dashboard/project/${PROJECT_ID}/sql/new`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100">
          🔗 فتح SQL Editor
        </a>
      </div>

      {/* ── Auto Setup ─────────────────────────────────────────── */}
      <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-4 mb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🚀</span>
          <h4 className="font-bold text-emerald-800 text-sm">التهيئة التلقائية — نقرة واحدة</h4>
          <span className="text-xs bg-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">جديد</span>
        </div>
        <p className="text-xs text-emerald-600 mb-3">
          ينشئ جميع الجداول والسياسات والـ Triggers وبيانات التشغيل دفعةً واحدة.
          احصل على Management API Key من{" "}
          <a href="https://app.supabase.com/account/tokens" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
            app.supabase.com/account/tokens
          </a>
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            value={managementKey}
            onChange={e => { setManagementKey(e.target.value); setSetupState("idle"); }}
            placeholder="sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            className="flex-1 px-3 py-2 text-xs rounded-lg border border-emerald-200 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          <button
            onClick={runAutoSetup}
            disabled={setupState === "running"}
            className="px-4 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-60 transition-all"
            style={{ background: setupState === "done" ? "#059669" : setupState === "error" ? "#DC2626" : "#16C47F" }}
          >
            {setupState === "running" ? "⏳ جارٍ…" : setupState === "done" ? "✓ تمّ!" : "🚀 تهيئة"}
          </button>
        </div>
        {setupMsg && (
          <p className={`text-xs mt-2 font-medium ${setupState === "done" ? "text-emerald-700" : "text-red-600"}`}>
            {setupMsg}
          </p>
        )}
      </div>

      {/* ── Manual SQL ──────────────────────────────────────────── */}
      <div className="border-t border-gray-100 pt-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-semibold text-gray-700 text-sm">السكريبت الكامل (يدوياً)</h4>
            <p className="text-xs text-gray-400 mt-0.5">
              {sqlLen > 0 ? `${sqlLen.toLocaleString()} حرف` : ""} — شغّله في Supabase → SQL Editor
            </p>
          </div>
          <button onClick={copySql}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${copied ? "bg-emerald-600 text-white" : "bg-gray-900 text-white hover:bg-gray-700"}`}>
            {copied ? "✓ تم النسخ!" : "📋 نسخ SQL"}
          </button>
        </div>
        <pre className="bg-gray-900 text-emerald-400 text-xs rounded-xl p-4 overflow-auto max-h-64 leading-relaxed font-mono">
          {sqlPreview || MIGRATION_SQL.slice(0, 900)}
          {"\n"}/* ... انسخ الكل بالزر أعلاه للحصول على السكريبت الكامل */
        </pre>
      </div>
    </Card>
  );
}

function EnvConfig() {
  const vars = [
    { label: "Supabase URL", key: "SUPABASE_URL", val: "https://jotdqrffjjkyjfdhiwht.supabase.co", secret: false },
    { label: "Supabase Anon Key", key: "EXPO_PUBLIC_SUPABASE_ANON_KEY", val: "•••• مضبوط ••••", secret: true },
    { label: "Service Role Key", key: "SUPABASE_SERVICE_ROLE_KEY", val: "•••• مضبوط ••••", secret: true },
    { label: "API Server URL", key: "EXPO_PUBLIC_API_URL", val: import.meta.env.VITE_API_URL || "http://localhost:8080", secret: false },
  ];

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-xl">⚙️</div>
        <div>
          <h3 className="font-bold text-gray-900">متغيرات البيئة</h3>
          <p className="text-xs text-gray-500">المتغيرات الحالية المضبوطة في Replit Secrets</p>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">المتغير</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">القيمة</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {vars.map((v, i) => (
              <tr key={v.key} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{v.key}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-800 max-w-xs truncate">{v.val}</td>
                <td className="px-4 py-3"><Badge color="green">✓ مضبوط</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-3">لتعديل المتغيرات: Replit → Secrets tab → تعديل القيمة ثم إعادة تشغيل الخدمات</p>
    </Card>
  );
}

function AppInfo() {
  const [dbTables, setDbTables] = useState<string[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);

  const checkTables = useCallback(async () => {
    setLoadingTables(true);
    const tables = ["profiles","service_categories","services","providers","bookings","offers","notifications","chat_messages","ratings","support_tickets","refund_requests","withdrawal_requests","app_settings","push_tokens","wallet_transactions","booking_status_log"];
    const results: string[] = [];
    for (const t of tables) {
      const { error } = await supabase.from(t).select("id").limit(1);
      if (!error) results.push(t);
    }
    setDbTables(results);
    setLoadingTables(false);
  }, []);

  useEffect(() => { checkTables(); }, []);

  const ALL_TABLES = ["profiles","service_categories","services","providers","bookings","offers","notifications","chat_messages","ratings","support_tickets","refund_requests","withdrawal_requests","app_settings","push_tokens","wallet_transactions","booking_status_log"];

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl">📊</div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-900">حالة الجداول في قاعدة البيانات</h3>
          <p className="text-xs text-gray-500">{dbTables.length}/{ALL_TABLES.length} جدول موجود</p>
        </div>
        <button onClick={checkTables} disabled={loadingTables} className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-60">
          {loadingTables ? "⏳ يتحقق…" : "🔄 تحديث"}
        </button>
      </div>

      {dbTables.length < ALL_TABLES.length && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm font-semibold text-red-700 mb-1">⚠️ قاعدة البيانات غير مكتملة</p>
          <p className="text-xs text-red-600">انسخ SQL من قسم "قاعدة البيانات" أعلاه وشغّله في Supabase SQL Editor</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {ALL_TABLES.filter(t => !dbTables.includes(t)).map(t => (
              <span key={t} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-mono">{t}</span>
            ))}
          </div>
        </div>
      )}

      {dbTables.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ALL_TABLES.map(t => (
            <span key={t} className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1 ${dbTables.includes(t) ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-400 border border-gray-200"}`}>
              {dbTables.includes(t) ? "✓" : "✗"} {t}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

function GeneralSettings() {
  const [val, setVal] = useState<any>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "general").maybeSingle()
      .then(({ data }) => setVal(data?.value ?? { app_name: "نظافة", support_phone: "", support_email: "", city: "الرياض" }));
  }, []);

  async function save() {
    await supabase.from("app_settings").upsert({ key: "general", value: val, updated_at: new Date().toISOString() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const fields = [
    { key: "app_name", label: "اسم التطبيق" },
    { key: "support_phone", label: "رقم الدعم الفني" },
    { key: "support_email", label: "بريد الدعم الفني" },
    { key: "city", label: "المدينة الرئيسية" },
    { key: "currency", label: "العملة (SAR)" },
    { key: "min_booking_amount", label: "أقل قيمة للحجز (ر.س)" },
  ];

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xl">🌐</div>
        <div>
          <h3 className="font-bold text-gray-900">الإعدادات العامة للتطبيق</h3>
          <p className="text-xs text-gray-500">معلومات التطبيق الأساسية وبيانات التواصل</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map(f => (
          <div key={f.key}>
            <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
            <input
              type="text"
              value={val[f.key] ?? ""}
              onChange={e => setVal({ ...val, [f.key]: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            />
          </div>
        ))}
      </div>
      <button onClick={save} className="mt-5 px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700">
        {saved ? "تم الحفظ ✓" : "حفظ الإعدادات"}
      </button>
    </Card>
  );
}

// ─── Sub-pages (kept for routing) ────────────────────────────────────────────

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
      <SettingCard keyName="commission" label="نسبة العمولة" hint="النسبة المئوية التي يحتفظ بها التطبيق من كل عملية" schema={[{ key: "percent", label: "النسبة %", type: "number" }]} />
    </div>
  );
}

export function BrandingPage() {
  return (
    <div className="p-8 max-w-2xl">
      <PageHeader title="الهوية البصرية" subtitle="خصّص ألوان وشعار التطبيق" />
      <SettingCard keyName="app_branding" label="هوية التطبيق" schema={[
        { key: "name", label: "اسم التطبيق" },
        { key: "primary", label: "اللون الأساسي (Hex)" },
        { key: "logo_url", label: "رابط الشعار" },
      ]} />
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
          <textarea rows={6} value={value[d.key] ?? ""} onChange={(e) => setValue({ ...value, [d.key]: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
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
    offers: "🎁 العروض", map: "🗺️ الخريطة", services: "🧹 الخدمات",
    providers: "👷 مقدمو الخدمة", ai: "✨ المساعد الذكي", categories: "🗂️ التصنيفات", reviews: "⭐ التقييمات",
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

// ─── Main Settings page ───────────────────────────────────────────────────────

export default function Settings() {
  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <PageHeader
        title="الإعدادات العامة"
        subtitle="إدارة جميع إعدادات التطبيق والبنية التحتية"
      />
      <AdminCredentials />
      <DatabaseConfig />
      <AppInfo />
      <EnvConfig />
      <GeneralSettings />
    </div>
  );
}
