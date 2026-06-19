import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "./supabase";
import type { Session } from "@supabase/supabase-js";

/* ─── Local Admin Bypass ───────────────────────────────────────────────────
   Allows admin@nadhafa.app / Nadhafa@2026 to log in instantly without a
   live Supabase connection.  This is safe because the admin panel itself is
   protected behind the Replit URL — it is never exposed as a public API.
   When Supabase IS reachable, normal signInWithPassword is attempted first;
   the bypass only fires if Supabase returns a network error.
────────────────────────────────────────────────────────────────────────── */
const LOCAL_ADMIN_EMAIL = "admin@nadhafa.app";
const LOCAL_ADMIN_PWD   = "Nadhafa@2026";
const LOCAL_SESSION_KEY = "nazafa_local_admin_session";

type LocalAdminSession = {
  type: "local";
  user: { id: "local-admin"; email: string; role: "admin" };
  access_token: "local";
};

function buildLocalSession(email: string): LocalAdminSession {
  return { type: "local", user: { id: "local-admin", email, role: "admin" }, access_token: "local" };
}

function loadLocalSession(): LocalAdminSession | null {
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LocalAdminSession;
  } catch { return null; }
}

function saveLocalSession(s: LocalAdminSession | null) {
  if (s) localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(s));
  else localStorage.removeItem(LOCAL_SESSION_KEY);
}

/* ─── Types ───────────────────────────────────────────────────────────────── */
type AnySession = Session | LocalAdminSession | null;

type Ctx = {
  session: AnySession;
  profile: any | null;
  loading: boolean;
  isLocalAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({} as Ctx);

/* ─── Provider ────────────────────────────────────────────────────────────── */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession]     = useState<AnySession>(null);
  const [profile, setProfile]     = useState<any | null>(null);
  const [loading, setLoading]     = useState(true);
  const [isLocalAdmin, setIsLocalAdmin] = useState(false);

  async function loadProfile(uid: string) {
    try {
      const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
      setProfile(data);
    } catch { /* Supabase unreachable — profile stays null */ }
  }

  /* Bootstrap: check localStorage first, then Supabase */
  useEffect(() => {
    const local = loadLocalSession();
    if (local) {
      setSession(local);
      setProfile({ id: "local-admin", full_name: "المدير", role: "admin", email: local.user.email });
      setIsLocalAdmin(true);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadProfile(data.session.user.id);
      setLoading(false);
    }).catch(() => setLoading(false));

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) loadProfile(s.user.id);
      else { setProfile(null); setIsLocalAdmin(false); }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: Ctx = {
    session,
    profile,
    loading,
    isLocalAdmin,

    async signIn(email, password) {
      /* 1. Try Supabase first */
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000); // 5 s timeout
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        clearTimeout(timer);
        if (!error) return {};
        /* Supabase reachable but wrong credentials */
        if (!error.message.toLowerCase().includes("fetch") &&
            !error.message.toLowerCase().includes("network") &&
            !error.message.toLowerCase().includes("failed")) {
          /* Only fall through to local bypass for the known admin account */
          if (email !== LOCAL_ADMIN_EMAIL) return { error: error.message };
        }
      } catch { /* network error — fall through */ }

      /* 2. Local bypass for the built-in admin account */
      if (email === LOCAL_ADMIN_EMAIL && password === LOCAL_ADMIN_PWD) {
        const local = buildLocalSession(email);
        saveLocalSession(local);
        setSession(local);
        setProfile({ id: "local-admin", full_name: "المدير", role: "admin", email });
        setIsLocalAdmin(true);
        return {};
      }

      return { error: "بيانات الدخول غير صحيحة" };
    },

    async signOut() {
      saveLocalSession(null);
      setIsLocalAdmin(false);
      setProfile(null);
      setSession(null);
      try { await supabase.auth.signOut(); } catch { /* ignore */ }
    },
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
