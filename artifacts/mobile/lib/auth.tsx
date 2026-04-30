import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "./supabase";
import type { Session, User } from "@supabase/supabase-js";

export type Role = "user" | "provider" | "admin";

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  role: Role;
};

type Ctx = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  profileLoaded: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string; role?: Role }>;
  signUp: (p: { email: string; password: string; full_name: string; phone: string; role: Role }) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthCtx = createContext<Ctx | null>(null);

async function ensureProfile(uid: string, fallback?: Partial<Profile>): Promise<Profile> {
  const { data: existing, error: selErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", uid)
    .maybeSingle();

  if (existing && !selErr) return existing as Profile;

  // No profile row — derive from auth user metadata and upsert
  const { data: { user } } = await supabase.auth.getUser();
  const meta: any = user?.user_metadata || {};
  const draft: Profile = {
    id: uid,
    full_name: fallback?.full_name ?? meta.full_name ?? null,
    phone: fallback?.phone ?? meta.phone ?? null,
    email: user?.email ?? null,
    avatar_url: null,
    role: (fallback?.role ?? meta.role ?? "user") as Role,
  };

  const { data: created } = await supabase
    .from("profiles")
    .upsert(draft, { onConflict: "id" })
    .select("*")
    .maybeSingle();

  return (created as Profile) || draft;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const inFlight = useRef(false);

  const loadProfile = useCallback(async (uid: string) => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const p = await ensureProfile(uid);
      setProfile(p);
    } catch (e) {
      // Even if DB fails, set a minimal profile so the app can route forward
      const { data: { user } } = await supabase.auth.getUser();
      setProfile({
        id: uid,
        full_name: (user?.user_metadata as any)?.full_name ?? null,
        phone: (user?.user_metadata as any)?.phone ?? null,
        email: user?.email ?? null,
        avatar_url: null,
        role: ((user?.user_metadata as any)?.role as Role) ?? "user",
      });
    } finally {
      setProfileLoaded(true);
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let unsub: any;

    (async () => {
      const { data: { session: s0 } } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(s0);
      if (s0?.user) {
        await loadProfile(s0.user.id);
      } else {
        setProfileLoaded(true);
      }
      setLoading(false);

      const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
        setSession(s);
        if (s?.user) {
          setProfileLoaded(false);
          await loadProfile(s.user.id);
        } else {
          setProfile(null);
          setProfileLoaded(true);
        }
      });
      unsub = sub.subscription;
    })();

    return () => {
      mounted = false;
      unsub?.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data.user) {
      const p = await ensureProfile(data.user.id);
      setProfile(p);
      setProfileLoaded(true);
      return { role: p.role };
    }
    return {};
  }, []);

  const signUp = useCallback(async (p: { email: string; password: string; full_name: string; phone: string; role: Role }) => {
    const { data, error } = await supabase.auth.signUp({
      email: p.email,
      password: p.password,
      options: { data: { full_name: p.full_name, phone: p.phone, role: p.role } },
    });
    if (error) return { error: error.message };
    // Create profile immediately if we got a user back (depends on email-confirm setting)
    if (data.user) {
      try {
        await ensureProfile(data.user.id, { full_name: p.full_name, phone: p.phone, role: p.role });
      } catch {}
    }
    return {};
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setSession(null);
      setProfile(null);
      setProfileLoaded(true);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) {
      setProfileLoaded(false);
      await loadProfile(session.user.id);
    }
  }, [session, loadProfile]);

  return (
    <AuthCtx.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        profileLoaded,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth must be inside AuthProvider");
  return c;
}
