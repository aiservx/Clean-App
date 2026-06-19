import { useState } from "react";
import { useAuth } from "@/lib/auth";

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("admin@nadhafa.app");
  const [pwd, setPwd] = useState("Nadhafa@2026");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const { error } = await signIn(email, pwd);
    setLoading(false);
    if (error) setErr(error);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-2xl font-bold mb-3">ن</div>
          <h1 className="text-2xl font-bold text-gray-900">لوحة إدارة نظافة</h1>
          <p className="text-sm text-gray-500 mt-1">سجّل الدخول للمتابعة</p>
        </div>

        {/* Hint box */}
        <div className="mb-5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 text-center" dir="rtl">
          <span className="font-bold">بيانات المدير الافتراضية:</span><br />
          البريد: <span className="font-mono font-bold">admin@nadhafa.app</span>&nbsp;|&nbsp;
          كلمة المرور: <span className="font-mono font-bold">Nadhafa@2026</span>
        </div>

        <form onSubmit={submit} className="space-y-4" dir="rtl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-left"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">كلمة المرور</label>
            <input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              required
            />
          </div>
          {err && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg text-center">{err}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {loading ? "جارٍ التحقق…" : "تسجيل الدخول"}
          </button>
          <p className="text-xs text-gray-400 text-center pt-1">
            يعمل محلياً بدون اتصال Supabase أو عبر حساب المدير في Supabase
          </p>
        </form>
      </div>
    </div>
  );
}
