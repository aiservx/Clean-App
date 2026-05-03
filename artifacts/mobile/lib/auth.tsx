import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "./supabase";
import type { Session, User } from "@supabase/supabase-js";
import { getCurrentPushToken } from "./notifications";

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
  signUp: (p: { email: string; password: string; full_name: string; phone: string; role: Role; username?: string; gender?: string }) => Promise<{ error?: string }>;
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
      console.warn("[v0] loadProfile failed:", (e as Error)?.message);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setProfile({
          id: uid,
          full_name: (user?.user_metadata as any)?.full_name ?? null,
          phone: (user?.user_metadata as any)?.phone ?? null,
          email: user?.email ?? null,
          avatar_url: null,
          role: ((user?.user_metadata as any)?.role as Role) ?? "user",
        });
      } catch {
        setProfile({
          id: uid,
          full_name: null,
          phone: null,
          email: null,
          avatar_url: null,
          role: "user",
        });
      }
    } finally {
      setProfileLoaded(true);
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let unsub: any;

    (async () => {
      try {
        const { data: { session: s0 } } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(s0);
        if (s0?.user) {
          try {
            await loadProfile(s0.user.id);
          } catch {
            if (mounted) setProfileLoaded(true);
          }
        } else {
          if (mounted) setProfileLoaded(true);
        }
      } catch (e) {
        console.warn("[v0] getSession() failed:", (e as Error)?.message);
        try { await supabase.auth.signOut(); } catch {}
        if (mounted) {
          setSession(null);
          setProfile(null);
          setProfileLoaded(true);
        }
      } finally {
        if (mounted) setLoading(false);
      }

      try {
        const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
          if (!mounted) return;
          setSession(s);
          if (s?.user) {
            setProfileLoaded(false);
            try {
              await loadProfile(s.user.id);
            } catch {
              if (mounted) setProfileLoaded(true);
            }
          } else {
            setProfile(null);
            setProfileLoaded(true);
          }
        });
        unsub = sub.subscription;
      } catch (e) {
        console.warn("[v0] onAuthStateChange failed:", (e as Error)?.message);
      }
    })();

    return () => {
      mounted = false;
      unsub?.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      if (data.user) {
        try {
          const p = await ensureProfile(data.user.id);
          setProfile(p);
          setProfileLoaded(true);
          return { role: p.role };
        } catch (e) {
          console.warn("[v0] ensureProfile after signIn failed:", (e as Error)?.message);
          setProfileLoaded(true);
          return { role: "user" as Role };
        }
      }
      return {};
    } catch (e) {
      return { error: (e as Error)?.message || "Network error" };
    }
  }, []);

  const signUp = useCallback(async (p: { email: string; password: string; full_name: string; phone: string; role: Role; username?: string; gender?: string }) => {
    const apiBase = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");
    try {
      // Route through API server which uses Admin SDK to bypass broken trigger
      const res = await fetch(`${apiBase}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: p.username ?? p.email,
          password: p.password,
          full_name: p.full_name,
          phone: p.phone,
          role: p.role,
          gender: p.gender ?? "male",
        }),
      });
      const json = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || json.error) {
        return { error: json.error ?? "خطأ في إنشاء الحساب" };
      }
      return {};
    } catch (e) {
      return { error: (e as Error)?.message || "خطأ في الاتصال بالشبكة" };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const token = getCurrentPushToken();
      if (token) {
        await supabase.from("push_tokens").delete().eq("token", token);
      }
    } catch {}
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("[v0] signOut network call failed:", (e as Error)?.message);
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
