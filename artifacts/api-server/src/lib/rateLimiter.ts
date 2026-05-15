/**
 * Lightweight in-memory rate limiter — no external dependencies.
 * Uses a sliding-window counter per IP address.
 */

import type { Request, Response, NextFunction } from "express";

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
}

function createRateLimiter(config: RateLimitConfig) {
  const hits = new Map<string, number[]>();

  // Prune stale entries every windowMs to avoid unbounded memory growth
  setInterval(() => {
    const cutoff = Date.now() - config.windowMs;
    for (const [key, timestamps] of hits.entries()) {
      const fresh = timestamps.filter((t) => t > cutoff);
      if (fresh.length === 0) hits.delete(key);
      else hits.set(key, fresh);
    }
  }, config.windowMs).unref();

  return function rateLimitMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const ip =
      (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
      req.socket.remoteAddress ??
      "unknown";

    const now    = Date.now();
    const cutoff = now - config.windowMs;
    const current = (hits.get(ip) ?? []).filter((t) => t > cutoff);

    if (current.length >= config.max) {
      res.status(429).json({ error: config.message });
      return;
    }

    current.push(now);
    hits.set(ip, current);
    next();
  };
}

// ── Pre-built limiters ────────────────────────────────────────────────────

/** POST /api/auth/register — max 5 registrations per IP per minute */
export const registerLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 5,
  message: "محاولات كثيرة، يرجى الانتظار دقيقة ثم المحاولة مجدداً",
});

/** POST /api/push (and /api/push/batch) — max 60 calls per IP per minute */
export const pushLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 60,
  message: "too many push requests, try again later",
});

/** General API — max 200 requests per IP per minute */
export const generalLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 200,
  message: "too many requests, slow down",
});
