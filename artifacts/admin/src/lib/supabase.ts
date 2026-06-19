import { createClient } from "@supabase/supabase-js";

// Prefer VITE_ vars, fall back to EXPO_PUBLIC_ (shared Replit env vars),
// then fall back to the hardcoded anon-safe defaults.
const url =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.EXPO_PUBLIC_SUPABASE_URL ||
  "https://vbcblxhwnlzbreznfyau.supabase.co";

const key =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiY2JseGh3bmx6YnJlem5meWF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NDU1MTQsImV4cCI6MjA5NDQyMTUxNH0.ie1PHeQajLzAE-zPFFF8eggO7GgOdBadTaGdTAAHcaY";

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export type Json = Record<string, any>;
