import { useState } from "react";
import { useAuth } from "@/lib/auth";

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("admin@nazafa.sa");
  const [pwd, setPwd] = useState("admin123456");
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
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
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
          {err && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{err}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "جاري الدخول…" : "تسجيل الدخول"}
          </button>
          <div className="text-xs text-gray-400 text-center pt-2">
            البريد الافتراضي: admin@nazafa.sa<br />كلمة المرور: admin123456
          </div>
        </form>
      </div>
    </div>
  );
}
