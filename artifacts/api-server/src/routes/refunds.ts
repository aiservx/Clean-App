import { Router } from "express";
import type { IRouter, Request, Response } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://mffdpjwtwseftaqrslgx.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mZmRwand0d3NlZnRhcXJzbGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3OTY1MDAsImV4cCI6MjA5MzM3MjUwMH0.nDIPN8836RZ-37eKDTCL7-GrBE0tAus6V58qVyopZd8";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

async function verifyJwt(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const json: unknown = await res.json();
    if (typeof json === "object" && json !== null && "id" in json) {
      const id = (json as Record<string, unknown>).id;
      return typeof id === "string" ? id : null;
    }
    return null;
  } catch { return null; }
}

async function sbFetch(path: string, method = "GET", body?: unknown): Promise<unknown> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      Prefer: method === "POST" ? "return=representation" : "",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Supabase ${res.status}: ${txt}`);
  }
  return res.json().catch(() => null);
}

const VALID_REFUND_STATUSES = ["pending", "under_review", "approved", "rejected", "processed"];

// ── POST /api/refunds/request ──────────────────────────────────────────────
// Submit a new refund request for a completed or cancelled booking.
// Body: { booking_id, reason, amount? }

router.post("/refunds/request", async (req: Request, res: Response) => {
  const callerId = await verifyJwt(req.headers.authorization);
  if (!callerId) { res.status(401).json({ error: "unauthorized" }); return; }

  const { booking_id, reason, amount } = (req.body ?? {}) as Record<string, unknown>;

  if (typeof booking_id !== "string" || !booking_id) {
    res.status(400).json({ error: "booking_id is required" });
    return;
  }
  if (typeof reason !== "string" || !reason.trim()) {
    res.status(400).json({ error: "reason is required" });
    return;
  }

  try {
    // Verify booking belongs to caller and is in a refundable state
    const bookingRows = await sbFetch(
      `bookings?id=eq.${encodeURIComponent(booking_id)}&user_id=eq.${encodeURIComponent(callerId)}` +
      `&status=in.(completed,cancelled)&limit=1&select=id,total,status`,
    );

    if (!Array.isArray(bookingRows) || bookingRows.length === 0) {
      res.status(403).json({ error: "booking not found or not eligible for refund" });
      return;
    }

    const booking = bookingRows[0] as Record<string, unknown>;
    const refundAmount = typeof amount === "number" && amount > 0
      ? amount
      : Number((booking as any).total ?? 0);

    // Check if a refund request already exists
    const existingRows = await sbFetch(
      `refund_requests?booking_id=eq.${encodeURIComponent(booking_id)}&status=not.in.(rejected)&limit=1&select=id,status`,
    );
    if (Array.isArray(existingRows) && existingRows.length > 0) {
      const existing = existingRows[0] as Record<string, unknown>;
      res.status(409).json({ error: "refund request already exists", existing });
      return;
    }

    const result = await sbFetch("refund_requests", "POST", {
      user_id: callerId,
      booking_id,
      amount: refundAmount,
      reason: reason.trim(),
      status: "pending",
    });

    const refund = Array.isArray(result) ? result[0] : result;
    logger.info({ callerId, bookingId: booking_id, refundId: (refund as any)?.id, amount: refundAmount }, "refund: created");
    res.status(201).json({ refund });
  } catch (e) {
    logger.error({ err: e, callerId }, "refund: create failed");
    res.status(500).json({ error: "failed to create refund request" });
  }
});

// ── GET /api/refunds/history ───────────────────────────────────────────────
// Returns all refund requests for the authenticated user.

router.get("/refunds/history", async (req: Request, res: Response) => {
  const callerId = await verifyJwt(req.headers.authorization);
  if (!callerId) { res.status(401).json({ error: "unauthorized" }); return; }

  const limit = Math.min(Number(req.query.limit ?? 20), 50);

  try {
    const rows = await sbFetch(
      `refund_requests?user_id=eq.${encodeURIComponent(callerId)}&order=created_at.desc&limit=${limit}` +
      `&select=id,amount,status,reason,notes,created_at,updated_at,processed_at,` +
      `booking:booking_id(id,services:service_id(title_ar))`,
    );

    const refunds = (Array.isArray(rows) ? rows : []).map((r: any) => ({
      ...r,
      serviceName: r.booking?.services?.title_ar ?? "خدمة تنظيف",
      timeline: buildRefundTimeline(r),
    }));

    res.json({ refunds });
  } catch (e) {
    logger.error({ err: e, callerId }, "refund: history failed");
    res.status(500).json({ error: "failed to fetch refunds" });
  }
});

// ── GET /api/refunds/:id ───────────────────────────────────────────────────
// Returns a single refund request. Caller must be the owner or an admin.

router.get("/refunds/:id", async (req: Request, res: Response) => {
  const callerId = await verifyJwt(req.headers.authorization);
  if (!callerId) { res.status(401).json({ error: "unauthorized" }); return; }

  const id = String(req.params.id || "");
  if (!id) { res.status(400).json({ error: "refund id is required" }); return; }

  try {
    const rows = await sbFetch(
      `refund_requests?id=eq.${encodeURIComponent(id)}&limit=1` +
      `&select=id,user_id,booking_id,amount,status,reason,notes,created_at,updated_at,processed_at,` +
      `booking:booking_id(id,total,status,services:service_id(title_ar),provider:profiles!bookings_provider_id_fkey(full_name))`,
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(404).json({ error: "refund request not found" });
      return;
    }

    const refund = rows[0] as Record<string, unknown>;

    if (refund.user_id !== callerId) {
      const profileRows = await sbFetch(`profiles?select=role&id=eq.${encodeURIComponent(callerId)}&limit=1`);
      const isAdmin = Array.isArray(profileRows) && profileRows.length > 0 && (profileRows[0] as any).role === "admin";
      if (!isAdmin) { res.status(403).json({ error: "forbidden" }); return; }
    }

    res.json({ refund: { ...refund, timeline: buildRefundTimeline(refund) } });
  } catch (e) {
    logger.error({ err: e, callerId, refundId: id }, "refund: get failed");
    res.status(500).json({ error: "failed to fetch refund" });
  }
});

// ── PATCH /api/refunds/:id ─────────────────────────────────────────────────
// Update refund status (admin only).

router.patch("/refunds/:id", async (req: Request, res: Response) => {
  const callerId = await verifyJwt(req.headers.authorization);
  if (!callerId) { res.status(401).json({ error: "unauthorized" }); return; }

  const id = String(req.params.id || "");
  const { status, notes } = (req.body ?? {}) as Record<string, unknown>;

  try {
    const profileRows = await sbFetch(`profiles?select=role&id=eq.${encodeURIComponent(callerId)}&limit=1`);
    const isAdmin = Array.isArray(profileRows) && profileRows.length > 0 && (profileRows[0] as any).role === "admin";
    if (!isAdmin) { res.status(403).json({ error: "forbidden — admin only" }); return; }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof status === "string" && VALID_REFUND_STATUSES.includes(status)) {
      updates.status = status;
      if (status === "processed") updates.processed_at = new Date().toISOString();
    }
    if (typeof notes === "string") updates.notes = notes;

    await sbFetch(`refund_requests?id=eq.${encodeURIComponent(id)}`, "PATCH", updates);
    logger.info({ callerId, refundId: id, updates }, "refund: updated");
    res.json({ success: true });
  } catch (e) {
    logger.error({ err: e, callerId, refundId: id }, "refund: update failed");
    res.status(500).json({ error: "failed to update refund" });
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────

function buildRefundTimeline(refund: any): { label: string; at: string; status: string }[] {
  const STATUS_LABELS: Record<string, string> = {
    pending: "تم استلام الطلب", under_review: "قيد المراجعة",
    approved: "تمت الموافقة", rejected: "تم الرفض", processed: "تم الاسترداد",
  };
  const timeline: { label: string; at: string; status: string }[] = [
    { status: "pending", label: STATUS_LABELS.pending, at: refund.created_at },
  ];
  if (refund.status !== "pending") {
    timeline.push({ status: refund.status, label: STATUS_LABELS[refund.status] ?? refund.status, at: refund.updated_at ?? refund.created_at });
  }
  if (refund.processed_at) {
    timeline.push({ status: "processed", label: STATUS_LABELS.processed, at: refund.processed_at });
  }
  return timeline;
}

export default router;
