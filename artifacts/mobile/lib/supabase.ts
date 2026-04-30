import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// Hardcoded credentials — these are the publishable anon key, safe to embed
// in client code (same approach as artifacts/admin/src/lib/supabase.ts).
// Env-var override is kept so EAS secrets / .env still win when present.
const SUPABASE_URL = "https://ppokdtzlisaxsrmtwlrb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_4aV1hEm-Ow4oy6AAgUR7rg_miOdFXHa";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;

export const supabaseConfigured =
  url.startsWith("https://") && url !== "https://placeholder.supabase.co";

if (!supabaseConfigured) {
  console.warn(
    "[v0] Supabase URL looks invalid (" + url + "). Auth calls will fail.",
  );
}

// Safe AsyncStorage wrapper: if a stored session is corrupted, getItem can
// throw and crash the AuthProvider on app startup. Catching here ensures the
// app always boots, at worst as a logged-out user.
const safeStorage = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (e) {
      console.warn("[v0] AsyncStorage.getItem failed for", key, (e as Error)?.message);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.warn("[v0] AsyncStorage.setItem failed for", key, (e as Error)?.message);
    }
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn("[v0] AsyncStorage.removeItem failed for", key, (e as Error)?.message);
    }
  },
};

export const supabase = createClient(url, anon, {
  auth: {
    storage: safeStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
