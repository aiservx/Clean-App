import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Layout } from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Categories from "@/pages/Categories";
import Services from "@/pages/Services";
import Providers from "@/pages/Providers";
import Customers from "@/pages/Customers";
import Bookings from "@/pages/Bookings";
import Refunds from "@/pages/Refunds";
import Withdrawals from "@/pages/Withdrawals";
import Offers from "@/pages/Offers";
import Notifications from "@/pages/Notifications";
import Support from "@/pages/Support";
import Settings, { CommissionPage, BrandingPage, PoliciesPage, HomeBuilderPage } from "@/pages/Settings";
import OTAUpdates from "@/pages/OTAUpdates";

const queryClient = new QueryClient();

function Routes() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/services" component={Services} />
      <Route path="/categories" component={Categories} />
      <Route path="/providers" component={Providers} />
      <Route path="/customers" component={Customers} />
      <Route path="/bookings" component={Bookings} />
      <Route path="/refunds" component={Refunds} />
      <Route path="/withdrawals" component={Withdrawals} />
      <Route path="/offers" component={Offers} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/support" component={Support} />
      <Route path="/policies" component={PoliciesPage} />
      <Route path="/branding" component={BrandingPage} />
      <Route path="/home-builder" component={HomeBuilderPage} />
      <Route path="/commission" component={CommissionPage} />
      <Route path="/ota-updates" component={OTAUpdates} />
      <Route path="/settings" component={Settings} />
      <Route>
        <div className="p-8">
          <h1 className="text-2xl font-bold">صفحة غير موجودة</h1>
        </div>
      </Route>
    </Switch>
  );
}

function Gate() {
  const { session, profile, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">جاري التحميل…</div>
      </div>
    );
  }
  if (!session) return <Login />;
  if (profile && profile.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-2xl font-bold mb-2">لا تملك الصلاحيات</div>
        <div className="text-gray-500 mb-4">هذا الحساب ليس حساب مدير.</div>
        <button onClick={() => import("@/lib/supabase").then((m) => m.supabase.auth.signOut())} className="px-5 py-2 rounded-lg bg-red-600 text-white">
          تسجيل الخروج
        </button>
      </div>
    );
  }
  return (
    <Layout>
      <Routes />
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Gate />
        </WouterRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
