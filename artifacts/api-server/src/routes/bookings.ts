import { Router } from "express";
import type { IRouter, Request, Response } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? "https://mffdpjwtwseftaqrslgx.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mZmRwand0d3NlZnRhcXJzbGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3OTY1MDAsImV4cCI6MjA5MzM3MjUwMH0.nDIPN8836RZ-37eKDTCL7-GrBE0tAus6V58qVyopZd8";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// ── Verify Supabase JWT, return { userId } or null ────────────────────────

async function verifyJwt(authHeader: string | undefined): Promise<string | null> {
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
    if (typeof json === "object" && json !== null && "id" in json) {
      const id = (json as Record<string, unknown>).id;
      return typeof id === "string" ? id : null;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Supabase REST helper (service key) ────────────────────────────────────

async function sbFetch(path: string): Promise<unknown> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Supabase ${res.status}: ${txt}`);
  }
  return res.json();
}

// ── GET /api/bookings/active ───────────────────────────────────────────────
// Returns the most recent non-cancelled booking for the authenticated user
// along with status log and provider location.

router.get("/bookings/active", async (req: Request, res: Response) => {
  const callerId = await verifyJwt(req.headers.authorization);
  if (!callerId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  try {
    const rows = await sbFetch(
      `bookings` +
      `?select=id,status,total,scheduled_at,created_at,payment_method,notes,` +
      `services:service_id(title_ar,base_price),` +
      `provider:profiles!bookings_provider_id_fkey(id,full_name,avatar_url),` +
      `provider_location:providers!bookings_provider_id_fkey(current_lat,current_lng,rating)` +
      `&user_id=eq.${encodeURIComponent(callerId)}` +
      `&status=not.in.(cancelled,rejected)` +
      `&order=created_at.desc` +
      `&limit=1`,
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      res.json({ booking: null });
      return;
    }

    const booking = rows[0] as Record<string, unknown>;

    // Fetch status log
    let statusLog: unknown[] = [];
    try {
      const logRows = await sbFetch(
        `booking_status_log?booking_id=eq.${encodeURIComponent(booking.id as string)}&order=created_at.asc&select=status,created_at`,
      );
      if (Array.isArray(logRows)) statusLog = logRows;
    } catch (e) {
      logger.warn({ err: e, bookingId: booking.id }, "bookings/active: status log fetch failed");
    }

    res.json({ booking: { ...booking, status_log: statusLog } });
  } catch (e) {
    logger.error({ err: e, callerId }, "bookings/active: failed");
    res.status(500).json({ error: "internal server error" });
  }
});

// ── GET /api/bookings/:id ──────────────────────────────────────────────────
// Returns a single booking by ID. Caller must be the owner (user or provider).

router.get("/bookings/:id", async (req: Request, res: Response) => {
  const callerId = await verifyJwt(req.headers.authorization);
  if (!callerId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const { id } = req.params;
  if (!id || typeof id !== "string") {
    res.status(400).json({ error: "booking id is required" });
    return;
  }

  try {
    // Fetch booking (service key bypasses RLS; ownership checked manually below)
    const rows = await sbFetch(
      `bookings` +
      `?select=id,user_id,provider_id,status,total,scheduled_at,created_at,payment_method,notes,` +
      `services:service_id(title_ar,base_price,duration_min),` +
      `customer:profiles!bookings_user_id_fkey(id,full_name,avatar_url,phone),` +
      `provider:profiles!bookings_provider_id_fkey(id,full_name,avatar_url),` +
      `provider_location:providers!bookings_provider_id_fkey(current_lat,current_lng,rating,experience_years)` +
      `&id=eq.${encodeURIComponent(id)}` +
      `&limit=1`,
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(404).json({ error: "booking not found" });
      return;
    }

    const booking = rows[0] as Record<string, unknown>;

    // Authorization: caller must be owner (user or provider) or admin
    const isOwner = booking.user_id === callerId || booking.provider_id === callerId;
    if (!isOwner) {
      // Check admin
      const profileRows = await sbFetch(
        `profiles?select=role&id=eq.${encodeURIComponent(callerId)}&limit=1`,
      );
      const isAdmin =
        Array.isArray(profileRows) &&
        profileRows.length > 0 &&
        (profileRows[0] as Record<string, unknown>).role === "admin";
      if (!isAdmin) {
        res.status(403).json({ error: "forbidden" });
        return;
      }
    }

    // Fetch status log
    let statusLog: unknown[] = [];
    try {
      const logRows = await sbFetch(
        `booking_status_log?booking_id=eq.${encodeURIComponent(id)}&order=created_at.asc&select=status,created_at`,
      );
      if (Array.isArray(logRows)) statusLog = logRows;
    } catch (e) {
      logger.warn({ err: e, bookingId: id }, "bookings/:id: status log fetch failed");
    }

    // Compute invoice breakdown
    const svc = booking.services as Record<string, unknown> | null;
    const basePrice = Number((svc as any)?.base_price ?? 0);
    const fee = 10;
    const vat = Math.round((basePrice + fee) * 0.15 * 100) / 100;
    const total = Number(booking.total ?? basePrice + fee + vat);

    const invoice = { basePrice, fee, vat, total };

    res.json({ booking: { ...booking, status_log: statusLog, invoice } });
  } catch (e) {
    logger.error({ err: e, callerId, bookingId: id }, "bookings/:id: failed");
    res.status(500).json({ error: "internal server error" });
  }
});

// ── GET /api/bookings/:id/tracking ────────────────────────────────────────
// Returns lightweight live-tracking data: status, provider location, ETA.

router.get("/bookings/:id/tracking", async (req: Request, res: Response) => {
  const callerId = await verifyJwt(req.headers.authorization);
  if (!callerId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const { id } = req.params;
  if (!id || typeof id !== "string") {
    res.status(400).json({ error: "booking id is required" });
    return;
  }

  try {
    const rows = await sbFetch(
      `bookings` +
      `?select=id,user_id,provider_id,status,scheduled_at,` +
      `provider:profiles!bookings_provider_id_fkey(full_name),` +
      `provider_location:providers!bookings_provider_id_fkey(current_lat,current_lng,rating)` +
      `&id=eq.${encodeURIComponent(id)}` +
      `&limit=1`,
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(404).json({ error: "booking not found" });
      return;
    }

    const booking = rows[0] as Record<string, unknown>;

    const isOwner = booking.user_id === callerId || booking.provider_id === callerId;
    if (!isOwner) {
      const profileRows = await sbFetch(
        `profiles?select=role&id=eq.${encodeURIComponent(callerId)}&limit=1`,
      );
      const isAdmin =
        Array.isArray(profileRows) &&
        profileRows.length > 0 &&
        (profileRows[0] as Record<string, unknown>).role === "admin";
      if (!isAdmin) {
        res.status(403).json({ error: "forbidden" });
        return;
      }
    }

    const loc = booking.provider_location as Record<string, unknown> | null;
    const prov = booking.provider as Record<string, unknown> | null;

    // Latest status log entry
    let latestLog: unknown = null;
    try {
      const logRows = await sbFetch(
        `booking_status_log?booking_id=eq.${encodeURIComponent(id)}&order=created_at.desc&limit=1&select=status,created_at`,
      );
      if (Array.isArray(logRows) && logRows.length > 0) latestLog = logRows[0];
    } catch {}

    res.json({
      bookingId: booking.id,
      status: booking.status,
      scheduledAt: booking.scheduled_at,
      providerName: prov?.full_name ?? null,
      providerLat: (loc as any)?.current_lat ?? null,
      providerLng: (loc as any)?.current_lng ?? null,
      providerRating: (loc as any)?.rating ?? null,
      latestLog,
    });
  } catch (e) {
    logger.error({ err: e, callerId, bookingId: id }, "bookings/:id/tracking: failed");
    res.status(500).json({ error: "internal server error" });
  }
});

export default router;
