import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
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
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (p: { email: string; password: string; full_name: string; phone: string; role: Role }) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    if (data) setProfile(data as Profile);
  }, []);

  useEffect(() => {
    let unsub: any;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session?.user) await loadProfile(session.user.id);
      setLoading(false);
      const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
        setSession(s);
        if (s?.user) await loadProfile(s.user.id);
        else setProfile(null);
      });
      unsub = sub.subscription;
    })();
    return () => unsub?.unsubscribe();
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message };
  }, []);

  const signUp = useCallback(async (p: { email: string; password: string; full_name: string; phone: string; role: Role }) => {
    const { error } = await supabase.auth.signUp({
      email: p.email,
      password: p.password,
      options: { data: { full_name: p.full_name, phone: p.phone, role: p.role } },
    });
    return { error: error?.message };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  return (
    <AuthCtx.Provider value={{ session, user: session?.user ?? null, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth must be inside AuthProvider");
  return c;
}
