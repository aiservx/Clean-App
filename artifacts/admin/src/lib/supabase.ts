import { createClient } from "@supabase/supabase-js";

const url = "https://ppokdtzlisaxsrmtwlrb.supabase.co";
const key = "sb_publishable_4aV1hEm-Ow4oy6AAgUR7rg_miOdFXHa";

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export type Json = Record<string, any>;
