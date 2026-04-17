/**
 * middleware.ts — Express Middleware & Brute-Force Protection
 *
 * Contains rate limiting, brute-force attempt tracking, and
 * the requireUnlocked guard for protected API endpoints.
 */

import type express from "express";
import { isDbOpen } from "./db.js";

// ─── Brute-Force Protection — per-IP unlock attempt tracking ──────────────────

export interface AttemptEntry {
  count: number;
  lockedUntil: number;
}

const attemptMap = new Map<string, AttemptEntry>();

export const MAX_ATTEMPTS  = 5;
export const BASE_DELAY_MS = 2_000;   // 2 s delay even on first failure
export const LOCKOUT_MS    = 5 * 60_000; // 5 min lockout after MAX_ATTEMPTS

export function getAttemptEntry(ip: string): AttemptEntry {
  return attemptMap.get(ip) ?? { count: 0, lockedUntil: 0 };
}

export function recordFailedAttempt(ip: string): { locked: boolean; retryAfterSeconds: number } {
  const entry = getAttemptEntry(ip);
  entry.count++;

  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS;
    attemptMap.set(ip, entry);
    return { locked: true, retryAfterSeconds: LOCKOUT_MS / 1000 };
  }

  attemptMap.set(ip, entry);
  const delaySec = Math.min(BASE_DELAY_MS * Math.pow(2, entry.count - 1), 30_000) / 1000;
  return { locked: false, retryAfterSeconds: delaySec };
}

export function isLockedOut(ip: string): { locked: boolean; retryAfterSeconds: number } {
  const entry = getAttemptEntry(ip);
  if (entry.lockedUntil > Date.now()) {
    return { locked: true, retryAfterSeconds: Math.ceil((entry.lockedUntil - Date.now()) / 1000) };
  }
  return { locked: false, retryAfterSeconds: 0 };
}

export function clearAttempts(ip: string): void {
  attemptMap.delete(ip);
}

// Clean stale entries every 10 min
setInterval(() => {
  const now = Date.now();
  for (const [ip, e] of attemptMap) {
    if (e.lockedUntil < now && e.count < MAX_ATTEMPTS) attemptMap.delete(ip);
  }
}, 10 * 60_000);

// ─── General Rate Limiter ─────────────────────────────────────────────────────

interface RateLimitEntry { count: number; firstAttempt: number; lockedUntil: number; }
const rateLimitMap = new Map<string, RateLimitEntry>();
const RL_WINDOW_MS = 60_000;
const RL_MAX       = 5;
const RL_LOCKOUT   = 5 * 60_000;

export function rateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip  = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  let e     = rateLimitMap.get(ip);

  if (e && now < e.lockedUntil) {
    res.status(429).json({ error: "Too many requests.", retryAfterSeconds: Math.ceil((e.lockedUntil - now) / 1000) });
    return;
  }
  if (!e || now - e.firstAttempt > RL_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, firstAttempt: now, lockedUntil: 0 });
    next(); return;
  }
  e.count++;
  if (e.count > RL_MAX) {
    e.lockedUntil = now + RL_LOCKOUT;
    res.status(429).json({ error: "Rate limit exceeded.", retryAfterSeconds: RL_LOCKOUT / 1000 });
    return;
  }
  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, e] of rateLimitMap) {
    if (now - e.firstAttempt > RL_WINDOW_MS && now > e.lockedUntil) rateLimitMap.delete(ip);
  }
}, 10 * 60_000);

// ─── Auth Guard Middleware ────────────────────────────────────────────────────

/** Middleware that rejects requests when DB is locked. */
export function requireUnlocked(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!isDbOpen()) {
    res.status(403).json({ error: "Database is locked." });
    return;
  }
  next();
}
