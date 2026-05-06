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

const VALID_CATEGORIES = ["service_quality", "provider_behavior", "payment", "late_arrival", "other"];
const VALID_STATUSES = ["open", "in_progress", "resolved", "closed"];

// ── POST /api/tickets ──────────────────────────────────────────────────────
// Create a new support ticket.
// Body: { category, description, booking_id? }

router.post("/tickets", async (req: Request, res: Response) => {
  const callerId = await verifyJwt(req.headers.authorization);
  if (!callerId) { res.status(401).json({ error: "unauthorized" }); return; }

  const { category, description, booking_id } = (req.body ?? {}) as Record<string, unknown>;

  if (typeof category !== "string" || !VALID_CATEGORIES.includes(category)) {
    res.status(400).json({ error: `category must be one of: ${VALID_CATEGORIES.join(", ")}` });
    return;
  }
  if (typeof description !== "string" || !description.trim()) {
    res.status(400).json({ error: "description is required" });
    return;
  }

  try {
    const payload: Record<string, unknown> = {
      user_id: callerId,
      category,
      description: description.trim(),
      status: "open",
      priority: "normal",
    };
    if (typeof booking_id === "string" && booking_id) payload.booking_id = booking_id;

    const result = await sbFetch("support_tickets", "POST", payload);
    const ticket = Array.isArray(result) ? result[0] : result;

    logger.info({ callerId, ticketId: (ticket as any)?.id, category }, "ticket: created");
    res.status(201).json({ ticket });
  } catch (e) {
    logger.error({ err: e, callerId }, "ticket: create failed");
    res.status(500).json({ error: "failed to create ticket" });
  }
});

// ── GET /api/tickets/history ───────────────────────────────────────────────
// Returns all tickets for the authenticated user, ordered newest first.

router.get("/tickets/history", async (req: Request, res: Response) => {
  const callerId = await verifyJwt(req.headers.authorization);
  if (!callerId) { res.status(401).json({ error: "unauthorized" }); return; }

  const limit = Math.min(Number(req.query.limit ?? 20), 50);

  try {
    const rows = await sbFetch(
      `support_tickets?user_id=eq.${encodeURIComponent(callerId)}&order=created_at.desc&limit=${limit}` +
      `&select=id,category,description,status,priority,resolution,created_at,updated_at`,
    );
    res.json({ tickets: Array.isArray(rows) ? rows : [] });
  } catch (e) {
    logger.error({ err: e, callerId }, "ticket: history failed");
    res.status(500).json({ error: "failed to fetch tickets" });
  }
});

// ── GET /api/tickets/:id ───────────────────────────────────────────────────
// Returns a single ticket. Caller must be the owner or an admin.

router.get("/tickets/:id", async (req: Request, res: Response) => {
  const callerId = await verifyJwt(req.headers.authorization);
  if (!callerId) { res.status(401).json({ error: "unauthorized" }); return; }

  const id = String(req.params.id || "");
  if (!id) { res.status(400).json({ error: "ticket id is required" }); return; }

  try {
    const rows = await sbFetch(
      `support_tickets?id=eq.${encodeURIComponent(id)}&limit=1` +
      `&select=id,user_id,category,description,status,priority,resolution,created_at,updated_at,` +
      `booking:booking_id(id,services:service_id(title_ar))`,
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(404).json({ error: "ticket not found" });
      return;
    }

    const ticket = rows[0] as Record<string, unknown>;

    if (ticket.user_id !== callerId) {
      const profileRows = await sbFetch(`profiles?select=role&id=eq.${encodeURIComponent(callerId)}&limit=1`);
      const isAdmin = Array.isArray(profileRows) && profileRows.length > 0 && (profileRows[0] as any).role === "admin";
      if (!isAdmin) { res.status(403).json({ error: "forbidden" }); return; }
    }

    // Ticket status timeline (synthetic from status changes — use updated_at)
    const timeline = [
      { status: "open", label: "تم فتح التذكرة", at: ticket.created_at },
      ...(ticket.status !== "open" ? [{ status: ticket.status, label: ticket.status === "in_progress" ? "قيد المعالجة" : ticket.status === "resolved" ? "تم الحل" : "مغلق", at: ticket.updated_at }] : []),
    ];

    res.json({ ticket: { ...ticket, timeline } });
  } catch (e) {
    logger.error({ err: e, callerId, ticketId: id }, "ticket: get failed");
    res.status(500).json({ error: "failed to fetch ticket" });
  }
});

// ── PATCH /api/tickets/:id ─────────────────────────────────────────────────
// Update ticket status (admin only) or add a reply.

router.patch("/tickets/:id", async (req: Request, res: Response) => {
  const callerId = await verifyJwt(req.headers.authorization);
  if (!callerId) { res.status(401).json({ error: "unauthorized" }); return; }

  const id = String(req.params.id || "");
  const { status, resolution } = (req.body ?? {}) as Record<string, unknown>;

  try {
    const profileRows = await sbFetch(`profiles?select=role&id=eq.${encodeURIComponent(callerId)}&limit=1`);
    const isAdmin = Array.isArray(profileRows) && profileRows.length > 0 && (profileRows[0] as any).role === "admin";
    if (!isAdmin) { res.status(403).json({ error: "forbidden — admin only" }); return; }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof status === "string" && VALID_STATUSES.includes(status)) updates.status = status;
    if (typeof resolution === "string") updates.resolution = resolution;

    await sbFetch(`support_tickets?id=eq.${encodeURIComponent(id)}`, "PATCH", updates);
    logger.info({ callerId, ticketId: id, updates }, "ticket: updated");
    res.json({ success: true });
  } catch (e) {
    logger.error({ err: e, callerId, ticketId: id }, "ticket: update failed");
    res.status(500).json({ error: "failed to update ticket" });
  }
});

export default router;
