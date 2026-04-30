import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

// Validate that env vars are present and look reasonable. If they are missing
// at build time (common cause of APK crashes on login), log loudly so we can
// see it in `adb logcat`.
export const supabaseConfigured =
  !!process.env.EXPO_PUBLIC_SUPABASE_URL &&
  !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY &&
  url.startsWith("https://") &&
  url !== "https://placeholder.supabase.co";

if (!supabaseConfigured) {
  console.warn(
    "[v0] Supabase env vars missing or invalid at build time. " +
      "EXPO_PUBLIC_SUPABASE_URL=" + (process.env.EXPO_PUBLIC_SUPABASE_URL ? "set" : "MISSING") +
      ", EXPO_PUBLIC_SUPABASE_ANON_KEY=" + (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? "set" : "MISSING") +
      ". Auth calls will fail. Make sure these are passed to `eas build` (eas.json env) or `expo build`."
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
