import { Router, type IRouter, type Request, type Response } from "express";
import { logger } from "../lib/logger";
import { registerLimiter } from "../lib/rateLimiter";

const router: IRouter = Router();

// Resolve project URL — prefer SUPABASE_URL, then EXPO_PUBLIC_SUPABASE_URL, then known project
const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  "https://jotdqrffjjkyjfdhiwht.supabase.co";

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  "";

// Convert any username (Arabic, Latin, etc.) to a deterministic valid email
function usernameToEmail(username: string): string {
  const raw = username.trim();
  if (raw.includes("@")) return raw;
  const lower = raw.toLowerCase();
  let h = 0x811c9dc5;
  for (let i = 0; i < lower.length; i++) {
    const code = lower.codePointAt(i) ?? 0;
    h ^= code;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `u${h.toString(36)}@clean-app.local`;
}

// POST /api/auth/register
// Primary: creates via Admin API (service role key required).
// Fallback: uses regular /auth/v1/signup when no service key is available.
router.post("/auth/register", registerLimiter, async (req: Request, res: Response) => {
  const { username, password, full_name, phone, role, gender } = req.body as {
    username?: string;
    password?: string;
    full_name?: string;
    phone?: string;
    role?: string;
    gender?: string;
  };

  if (!username || !password) {
    res.status(400).json({ error: "يرجى إدخال اسم المستخدم وكلمة المرور" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
    return;
  }

  const email = usernameToEmail(username);
  // "admin" is never allowed via self-registration
  const safeRole = ["user", "provider"].includes(role ?? "") ? role : "user";
  const userMeta = {
    full_name: full_name ?? "",
    phone: phone ?? "",
    role: safeRole,
    username: username.trim(),
    gender: gender ?? "male",
  };

  try {
    // ── Path A: Admin API (preferred — auto-confirms email) ───────────────
    if (SUPABASE_SERVICE_KEY) {
      const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          email_confirm: true,
          user_metadata: userMeta,
        }),
      });

      const createData = await createRes.json() as any;

      if (!createRes.ok) {
        const msg: string = createData?.msg ?? createData?.message ?? "";
        logger.warn({ status: createRes.status, msg }, "Admin create user failed");
        if (msg.includes("already registered") || msg.includes("already exists") || createRes.status === 422) {
          res.status(409).json({ error: "اسم المستخدم هذا مستخدم بالفعل، جرّب اسماً آخر" });
        } else if (msg.includes("password") || msg.includes("Password")) {
          res.status(400).json({ error: "كلمة المرور ضعيفة، اختر كلمة أقوى" });
        } else {
          res.status(500).json({ error: "خطأ في إنشاء الحساب، حاول مرة أخرى" });
        }
        return;
      }

      const uid: string = createData.id;
      await upsertProfile(SUPABASE_URL, SUPABASE_SERVICE_KEY, uid, email, full_name, phone, safeRole);
      if (safeRole === "provider") {
        await insertProvider(SUPABASE_URL, SUPABASE_SERVICE_KEY, uid);
      }
      logger.info({ uid, role: safeRole }, "User registered via admin API");
      res.json({ success: true, uid });
      return;
    }

    // ── Path B: Regular signup (no service key — email confirmation may be needed) ──
    logger.warn("SUPABASE_SERVICE_ROLE_KEY not set — falling back to regular signup");
    const signupRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, data: userMeta }),
    });

    const signupData = await signupRes.json() as any;

    if (!signupRes.ok) {
      const msg: string =
        signupData?.msg ?? signupData?.message ?? signupData?.error_description ?? "";
      logger.warn({ status: signupRes.status, msg }, "Fallback signup failed");
      if (
        msg.includes("already registered") ||
        msg.includes("already exists") ||
        signupRes.status === 422
      ) {
        res.status(409).json({ error: "اسم المستخدم هذا مستخدم بالفعل، جرّب اسماً آخر" });
      } else if (msg.includes("password") || msg.includes("Password")) {
        res.status(400).json({ error: "كلمة المرور ضعيفة، اختر كلمة أقوى" });
      } else {
        res.status(500).json({ error: "خطأ في إنشاء الحساب، حاول مرة أخرى" });
      }
      return;
    }

    // Supabase signup returns user object (confirmed) or session (if email confirm disabled)
    const uid: string | undefined =
      signupData?.user?.id ?? signupData?.id ?? undefined;

    if (uid) {
      // Try to create profile — use access_token if returned, otherwise anon key
      const tok = signupData?.session?.access_token ?? signupData?.access_token ?? SUPABASE_ANON_KEY;
      await upsertProfile(SUPABASE_URL, tok, uid, email, full_name, phone, safeRole);
      if (safeRole === "provider") {
        await insertProvider(SUPABASE_URL, tok, uid);
      }
    }
    // Profile will also be auto-created by ensureProfile() in lib/auth.tsx on first login

    logger.info({ uid, role: safeRole }, "User registered via fallback signup");
    res.json({ success: true, uid: uid ?? null });
  } catch (e) {
    logger.error({ err: e }, "Register endpoint error");
    res.status(500).json({ error: "خطأ في الاتصال بالشبكة" });
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────

async function upsertProfile(
  supabaseUrl: string,
  token: string,
  uid: string,
  email: string,
  full_name?: string,
  phone?: string,
  role?: string,
): Promise<void> {
  try {
    await fetch(`${supabaseUrl}/rest/v1/profiles`, {
      method: "POST",
      headers: {
        apikey: token,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        id: uid,
        email,
        full_name: full_name || null,
        phone: phone || null,
        role: role ?? "user",
        avatar_url: null,
      }),
    });
  } catch (e) {
    logger.warn({ err: e }, "upsertProfile failed — will retry on login");
  }
}

async function insertProvider(
  supabaseUrl: string,
  token: string,
  uid: string,
): Promise<void> {
  try {
    await fetch(`${supabaseUrl}/rest/v1/providers`, {
      method: "POST",
      headers: {
        apikey: token,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates",
      },
      body: JSON.stringify({ id: uid }),
    });
  } catch (e) {
    logger.warn({ err: e }, "insertProvider failed — provider row may already exist");
  }
}

export default router;
