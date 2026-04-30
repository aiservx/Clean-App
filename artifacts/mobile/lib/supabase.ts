import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://ppokdtzlisaxsrmtwlrb.supabase.co";
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_4aV1hEm-Ow4oy6AAgUR7rg_miOdFXHa";

export const supabase = createClient(url, anon, {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
