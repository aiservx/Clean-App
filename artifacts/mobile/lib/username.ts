/**
 * Converts any username (including Arabic / non-ASCII) to a valid email
 * address that Supabase will accept.  The mapping is deterministic so the
 * same username always produces the same email on both signup and login.
 *
 * Strategy: FNV-1a 32-bit hash → base-36 string → "u<hash>@clean-app.local"
 */
export function usernameToEmail(username: string): string {
  const raw = username.trim();
  if (raw.includes("@")) return raw;

  const lower = raw.toLowerCase();
  let h = 0x811c9dc5;
  for (let i = 0; i < lower.length; i++) {
    // Handle multi-byte / surrogate pairs properly
    const code = lower.codePointAt(i) ?? 0;
    h ^= code;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `u${h.toString(36)}@clean-app.local`;
}
