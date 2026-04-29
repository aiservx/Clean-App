import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";

const NAV: { path: string; label: string; icon: string }[] = [
  { path: "/", label: "الرئيسية", icon: "📊" },
  { path: "/services", label: "الخدمات", icon: "🧹" },
  { path: "/categories", label: "التصنيفات", icon: "🗂️" },
  { path: "/providers", label: "مقدمو الخدمة", icon: "👷" },
  { path: "/customers", label: "العملاء", icon: "👥" },
  { path: "/bookings", label: "الحجوزات", icon: "📅" },
  { path: "/refunds", label: "الاستردادات", icon: "💸" },
  { path: "/withdrawals", label: "السحوبات", icon: "🏦" },
  { path: "/offers", label: "العروض", icon: "🎁" },
  { path: "/notifications", label: "الإشعارات", icon: "🔔" },
  { path: "/support", label: "الدعم الفني", icon: "🎧" },
  { path: "/policies", label: "السياسات", icon: "📜" },
  { path: "/branding", label: "الهوية والألوان", icon: "🎨" },
  { path: "/home-builder", label: "بناء الصفحة الرئيسية", icon: "🧩" },
  { path: "/commission", label: "العمولة", icon: "💰" },
  { path: "/settings", label: "الإعدادات", icon: "⚙️" },
];

export function Layout({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const { profile, signOut } = useAuth();
  return (
    <div className="flex h-screen w-screen bg-[#F6F8FB]">
      <aside className="w-64 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold">ن</div>
            <div>
              <div className="font-bold text-gray-900">نظافة</div>
              <div className="text-xs text-gray-500">لوحة الإدارة</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto scroll-thin p-2">
          {NAV.map((n) => {
            const active = loc === n.path || (n.path !== "/" && loc.startsWith(n.path));
            return (
              <Link key={n.path} href={n.path}>
                <a
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition ${
                    active
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-lg">{n.icon}</span>
                  <span>{n.label}</span>
                </a>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-2 px-2">
            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
              {profile?.full_name?.[0] || "م"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{profile?.full_name || "مدير"}</div>
              <div className="text-xs text-gray-500 truncate">{profile?.email}</div>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="w-full text-sm text-red-600 hover:bg-red-50 rounded-lg py-2"
          >
            تسجيل الخروج
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto scroll-thin">{children}</main>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
