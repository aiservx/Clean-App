import React, { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const NAV: { path: string; label: string; icon: string; section?: string }[] = [
  { path: "/", label: "الرئيسية", icon: "📊", section: "عام" },
  { path: "/analytics", label: "التحليلات", icon: "📈", section: "عام" },
  { path: "/financial", label: "التقارير المالية", icon: "💰", section: "عام" },
  { path: "/dynamic-pricing", label: "التسعير الديناميكي", icon: "⚡", section: "عام" },
  { path: "/live-map", label: "خريطة المزودين", icon: "🗺️", section: "عام" },
  { path: "/services", label: "الخدمات", icon: "🧹", section: "الكتالوج" },
  { path: "/categories", label: "التصنيفات", icon: "🗂️", section: "الكتالوج" },
  { path: "/providers", label: "مقدمو الخدمة", icon: "👷", section: "المستخدمون" },
  { path: "/customers", label: "العملاء", icon: "👥", section: "المستخدمون" },
  { path: "/bookings", label: "الحجوزات", icon: "📅", section: "العمليات" },
  { path: "/refunds", label: "الاستردادات", icon: "💸", section: "العمليات" },
  { path: "/withdrawals", label: "السحوبات", icon: "🏦", section: "العمليات" },
  { path: "/offers", label: "العروض", icon: "🎁", section: "التسويق" },
  { path: "/promo-codes", label: "أكواد الخصم", icon: "🏷️", section: "التسويق" },
  { path: "/notifications", label: "الإشعارات", icon: "🔔", section: "التسويق" },
  { path: "/reviews", label: "التقييمات", icon: "⭐", section: "الدعم" },
  { path: "/support", label: "الدعم الفني", icon: "🎧", section: "الدعم" },
  { path: "/policies", label: "السياسات", icon: "📜", section: "الإعدادات" },
  { path: "/branding", label: "الهوية والألوان", icon: "🎨", section: "الإعدادات" },
  { path: "/home-builder", label: "بناء الصفحة الرئيسية", icon: "🧩", section: "الإعدادات" },
  { path: "/commission", label: "العمولة", icon: "💰", section: "الإعدادات" },
  { path: "/ota-updates", label: "التحديثات الفورية", icon: "🔄", section: "الإعدادات" },
  { path: "/settings", label: "الإعدادات العامة", icon: "⚙️", section: "الإعدادات" },
];

// ── Status chip — unified with mobile STATUS_COLOR ─────────────────────────
const STATUS_AR: Record<string, string> = {
  pending:     "قيد الانتظار",
  accepted:    "مقبول",
  on_the_way:  "في الطريق",
  arrived:     "وصل للموقع",
  started:     "بدأ العمل",
  in_progress: "جاري التنفيذ",
  completed:   "مكتمل",
  cancelled:   "ملغي",
  rejected:    "مرفوض",
};

export function StatusChip({ status }: { status: string }) {
  return (
    <span className={`status-chip status-${status}`}>
      {STATUS_AR[status] ?? status}
    </span>
  );
}

// ── Live badge for pending bookings ────────────────────────────────────────
function PendingBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { count: c } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      setCount(c ?? 0);
    };
    load();

    const ch = supabase
      .channel("admin-nav-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  if (!count) return null;
  return (
    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold text-white"
      style={{ background: "var(--color-danger)", fontSize: 10 }}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const { profile, signOut } = useAuth();

  return (
    <div className="flex h-screen w-screen" style={{ background: "#F6F8FB" }}>
      {/* ── Sidebar ── */}
      <aside className="w-64 flex flex-col overflow-hidden"
        style={{ background: "#ffffff", borderLeft: "1px solid rgba(0,0,0,0.07)", boxShadow: "2px 0 12px rgba(0,0,0,0.04)" }}>

        {/* Logo */}
        <div className="p-5" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-lg"
              style={{ background: "linear-gradient(135deg, #16C47F, #0FA868)" }}>
              ن
            </div>
            <div>
              <div className="font-bold text-gray-900" style={{ fontSize: 16, fontFamily: "Tajawal, sans-serif" }}>نظافة</div>
              <div style={{ fontSize: 11, color: "#64748B" }}>لوحة الإدارة</div>
            </div>
            {/* Live dot */}
            <span className="live-dot mr-auto" title="متصل بالخادم" />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto scroll-thin p-2">
          {(() => {
            const sections: string[] = [];
            NAV.forEach((n) => { if (n.section && !sections.includes(n.section)) sections.push(n.section); });
            return sections.map((section) => (
              <div key={section}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#CBD5E1", padding: "10px 12px 4px", letterSpacing: "0.08em", fontFamily: "Tajawal, sans-serif", textTransform: "uppercase" }}>
                  {section}
                </div>
                {NAV.filter((n) => n.section === section).map((n) => {
                  const active = loc === n.path || (n.path !== "/" && loc.startsWith(n.path));
                  return (
                    <Link key={n.path} href={n.path}>
                      <a
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 text-sm font-medium transition-all"
                        style={{
                          background: active ? "var(--color-primary-light)" : "transparent",
                          color: active ? "var(--color-primary)" : "#374151",
                          fontWeight: active ? 700 : 500,
                        }}
                      >
                        <span style={{ fontSize: 15 }}>{n.icon}</span>
                        <span style={{ flex: 1, fontFamily: "Tajawal, sans-serif", fontSize: 13 }}>{n.label}</span>
                        {n.path === "/bookings" && <PendingBadge />}
                      </a>
                    </Link>
                  );
                })}
              </div>
            ));
          })()}
        </nav>

        {/* User footer */}
        <div className="p-3" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <div className="flex items-center gap-3 mb-2 px-2">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold"
              style={{ background: "var(--color-primary-light)", color: "var(--color-primary)", fontSize: 15 }}>
              {profile?.full_name?.[0] || "م"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold truncate" style={{ fontSize: 13 }}>{profile?.full_name || "مدير"}</div>
              <div className="truncate" style={{ fontSize: 11, color: "#64748B" }}>{(profile as any)?.email}</div>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="w-full rounded-xl py-2 text-sm font-bold transition-all hover:opacity-80"
            style={{ color: "var(--color-danger)", background: "#FEE2E2", fontFamily: "Tajawal, sans-serif" }}
          >
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto scroll-thin">{children}</main>
    </div>
  );
}

// ── PageHeader — matching mobile ScreenHeader style ────────────────────────
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="font-bold" style={{ fontSize: 22, color: "#0F172A", fontFamily: "Tajawal, sans-serif" }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ── Card — matching mobile card style ──────────────────────────────────────
export function Card({ children, className = "", style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`nazafa-card ${className}`} style={style}>
      {children}
    </div>
  );
}
