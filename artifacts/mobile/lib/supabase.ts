import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

if (!process.env.EXPO_PUBLIC_SUPABASE_URL) {
  console.warn("[v0] EXPO_PUBLIC_SUPABASE_URL not set — Supabase calls will fail gracefully");
}

export const supabase = createClient(url, anon, {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
