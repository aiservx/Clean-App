/**
 * Shared Supabase helpers for API server routes.
 * Centralises JWT verification and REST fetch so each route file
 * doesn't duplicate the same 30-line boilerplate.
 */

export const SUPABASE_URL =
  process.env.SUPABASE_URL ?? "https://vbcblxhwnlzbreznfyau.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiY2JseGh3bmx6YnJlem5meWF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NDU1MTQsImV4cCI6MjA5NDQyMTUxNH0.ie1PHeQajLzAE-zPFFF8eggO7GgOdBadTaGdTAAHcaY";

export const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// ── Verify Supabase JWT, return userId or null ────────────────────────────
export async function verifyJwt(
  authHeader: string | undefined,
): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    const json: unknown = await res.json();
    if (
      typeof json === "object" &&
      json !== null &&
      "id" in json
    ) {
      const id = (json as Record<string, unknown>).id;
      return typeof id === "string" ? id : null;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Supabase REST fetch with service key (bypasses RLS) ───────────────────
export async function sbFetch(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<unknown> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(method === "POST" ? { Prefer: "return=representation" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Supabase ${res.status}: ${txt}`);
  }
  return res.json().catch(() => null);
}

// ── Check if a userId has the admin role ──────────────────────────────────
export async function isAdminUser(userId: string): Promise<boolean> {
  if (!SUPABASE_SERVICE_KEY) return false;
  try {
    const rows = await sbFetch(
      `profiles?select=role&id=eq.${encodeURIComponent(userId)}&limit=1`,
    );
    return (
      Array.isArray(rows) &&
      rows.length > 0 &&
      (rows[0] as Record<string, unknown>).role === "admin"
    );
  } catch {
    return false;
  }
}
