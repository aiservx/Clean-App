import { Router } from "express";
import type { IRouter, Request, Response } from "express";
import { logger } from "../lib/logger";
import { verifyJwt, sbFetch, isAdminUser } from "../lib/supabase";

const router: IRouter = Router();

const VALID_CATEGORIES = ["service_quality", "provider_behavior", "payment", "late_arrival", "other"];
const VALID_STATUSES   = ["open", "in_progress", "resolved", "closed"];

// ── POST /api/tickets ──────────────────────────────────────────────────────
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
      res.status(404).json({ error: "ticket not found" }); return;
    }
    const ticket = rows[0] as Record<string, unknown>;
    if (ticket.user_id !== callerId && !(await isAdminUser(callerId))) {
      res.status(403).json({ error: "forbidden" }); return;
    }
    const timeline = [
      { status: "open", label: "تم فتح التذكرة", at: ticket.created_at },
      ...(ticket.status !== "open"
        ? [{ status: ticket.status, label: ticket.status === "in_progress" ? "قيد المعالجة" : ticket.status === "resolved" ? "تم الحل" : "مغلق", at: ticket.updated_at }]
        : []),
    ];
    res.json({ ticket: { ...ticket, timeline } });
  } catch (e) {
    logger.error({ err: e, callerId, ticketId: id }, "ticket: get failed");
    res.status(500).json({ error: "failed to fetch ticket" });
  }
});

// ── PATCH /api/tickets/:id — admin only ───────────────────────────────────
router.patch("/tickets/:id", async (req: Request, res: Response) => {
  const callerId = await verifyJwt(req.headers.authorization);
  if (!callerId) { res.status(401).json({ error: "unauthorized" }); return; }

  const id = String(req.params.id || "");
  const { status, resolution } = (req.body ?? {}) as Record<string, unknown>;

  if (!(await isAdminUser(callerId))) {
    res.status(403).json({ error: "forbidden — admin only" }); return;
  }

  try {
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
