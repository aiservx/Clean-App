import { createClient } from "@supabase/supabase-js";

const url = "https://mffdpjwtwseftaqrslgx.supabase.co";
const key = "sb_publishable_kZL_PGlnqQGstC3iZQI8Cw_7JYZP96D";

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export type Json = Record<string, any>;
