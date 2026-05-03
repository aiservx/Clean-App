import { Router, type IRouter, type Request, type Response } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? "https://mffdpjwtwseftaqrslgx.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mZmRwand0d3NlZnRhcXJzbGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3OTY1MDAsImV4cCI6MjA5MzM3MjUwMH0.nDIPN8836RZ-37eKDTCL7-GrBE0tAus6V58qVyopZd8";

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
// Creates user via Admin API (bypasses broken trigger) and inserts profile manually
router.post("/auth/register", async (req: Request, res: Response) => {
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
  const safeRole = ["user", "provider", "admin"].includes(role ?? "") ? role : "user";

  try {
    // Create user via Supabase Admin API — bypasses the trigger failure issue
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
        user_metadata: {
          full_name: full_name ?? "",
          phone: phone ?? "",
          role: safeRole,
          username: username.trim(),
          gender: gender ?? "male",
        },
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

    // Upsert profile — always overwrite so full_name/phone/role are correct
    await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        id: uid,
        email,
        full_name: full_name || null,
        phone: phone || null,
        role: safeRole,
        avatar_url: null,
      }),
    });

    // If provider, also insert into providers table
    if (safeRole === "provider") {
      await fetch(`${SUPABASE_URL}/rest/v1/providers`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "resolution=ignore-duplicates",
        },
        body: JSON.stringify({ id: uid }),
      });
    }

    logger.info({ uid, role: safeRole }, "User registered successfully");
    res.json({ success: true, uid });
  } catch (e) {
    logger.error({ err: e }, "Register endpoint error");
    res.status(500).json({ error: "خطأ في الاتصال بالشبكة" });
  }
});

export default router;
