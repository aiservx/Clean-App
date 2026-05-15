import { Router } from "express";
import type { IRouter, Request, Response } from "express";
import { logger } from "../lib/logger";
import { verifyJwt, sbFetch, isAdminUser } from "../lib/supabase";

const router: IRouter = Router();

// ── GET /api/bookings/active ───────────────────────────────────────────────
router.get("/bookings/active", async (req: Request, res: Response) => {
  const callerId = await verifyJwt(req.headers.authorization);
  if (!callerId) { res.status(401).json({ error: "unauthorized" }); return; }

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
      res.json({ booking: null }); return;
    }
    const booking = rows[0] as Record<string, unknown>;
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
router.get("/bookings/:id", async (req: Request, res: Response) => {
  const callerId = await verifyJwt(req.headers.authorization);
  if (!callerId) { res.status(401).json({ error: "unauthorized" }); return; }

  const { id } = req.params;
  if (!id || typeof id !== "string") {
    res.status(400).json({ error: "booking id is required" }); return;
  }

  try {
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
      res.status(404).json({ error: "booking not found" }); return;
    }
    const booking = rows[0] as Record<string, unknown>;
    const isOwner = booking.user_id === callerId || booking.provider_id === callerId;
    if (!isOwner && !(await isAdminUser(callerId))) {
      res.status(403).json({ error: "forbidden" }); return;
    }

    let statusLog: unknown[] = [];
    try {
      const logRows = await sbFetch(
        `booking_status_log?booking_id=eq.${encodeURIComponent(id)}&order=created_at.asc&select=status,created_at`,
      );
      if (Array.isArray(logRows)) statusLog = logRows;
    } catch (e) {
      logger.warn({ err: e, bookingId: id }, "bookings/:id: status log fetch failed");
    }

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
router.get("/bookings/:id/tracking", async (req: Request, res: Response) => {
  const callerId = await verifyJwt(req.headers.authorization);
  if (!callerId) { res.status(401).json({ error: "unauthorized" }); return; }

  const { id } = req.params;
  if (!id || typeof id !== "string") {
    res.status(400).json({ error: "booking id is required" }); return;
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
      res.status(404).json({ error: "booking not found" }); return;
    }
    const booking = rows[0] as Record<string, unknown>;
    const isOwner = booking.user_id === callerId || booking.provider_id === callerId;
    if (!isOwner && !(await isAdminUser(callerId))) {
      res.status(403).json({ error: "forbidden" }); return;
    }

    const loc  = booking.provider_location as Record<string, unknown> | null;
    const prov = booking.provider as Record<string, unknown> | null;
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
      providerLat:  (loc as any)?.current_lat  ?? null,
      providerLng:  (loc as any)?.current_lng  ?? null,
      providerRating: (loc as any)?.rating     ?? null,
      latestLog,
    });
  } catch (e) {
    logger.error({ err: e, callerId, bookingId: id }, "bookings/:id/tracking: failed");
    res.status(500).json({ error: "internal server error" });
  }
});

export default router;
