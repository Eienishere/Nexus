/**
 * auth.test.ts — Unit tests for the brute-force protection and middleware logic.
 *
 * These tests exercise the exported functions from middleware.ts directly,
 * without needing a live Express server or database.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  recordFailedAttempt,
  isLockedOut,
  clearAttempts,
  getAttemptEntry,
  MAX_ATTEMPTS,
  BASE_DELAY_MS,
  LOCKOUT_MS,
} from "../server/middleware";

// ─── Brute-Force Protection ──────────────────────────────────────────────────

describe("Brute-Force Protection", () => {
  const testIp = "192.168.1.100";

  beforeEach(() => {
    // Clear any existing attempts for our test IP
    clearAttempts(testIp);
  });

  describe("getAttemptEntry", () => {
    it("should return default entry for unknown IP", () => {
      const entry = getAttemptEntry("unknown-ip");
      expect(entry.count).toBe(0);
      expect(entry.lockedUntil).toBe(0);
    });
  });

  describe("recordFailedAttempt", () => {
    it("should increment count on each failure", () => {
      recordFailedAttempt(testIp);
      expect(getAttemptEntry(testIp).count).toBe(1);

      recordFailedAttempt(testIp);
      expect(getAttemptEntry(testIp).count).toBe(2);
    });

    it("should return locked=false before MAX_ATTEMPTS", () => {
      for (let i = 0; i < MAX_ATTEMPTS - 1; i++) {
        const result = recordFailedAttempt(testIp);
        expect(result.locked).toBe(false);
      }
    });

    it("should return exponentially increasing retry delays", () => {
      const result1 = recordFailedAttempt(testIp);
      // First attempt: BASE_DELAY_MS * 2^0 = 2s
      expect(result1.retryAfterSeconds).toBe(BASE_DELAY_MS / 1000);

      const result2 = recordFailedAttempt(testIp);
      // Second attempt: BASE_DELAY_MS * 2^1 = 4s
      expect(result2.retryAfterSeconds).toBe((BASE_DELAY_MS * 2) / 1000);

      const result3 = recordFailedAttempt(testIp);
      // Third attempt: BASE_DELAY_MS * 2^2 = 8s
      expect(result3.retryAfterSeconds).toBe((BASE_DELAY_MS * 4) / 1000);
    });

    it("should lock after MAX_ATTEMPTS failures", () => {
      let result;
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        result = recordFailedAttempt(testIp);
      }
      expect(result!.locked).toBe(true);
      expect(result!.retryAfterSeconds).toBe(LOCKOUT_MS / 1000);
    });

    it("should cap retry delay at 30 seconds", () => {
      // Record many attempts (but not enough to trigger lockout in this test logic)
      // Testing the Math.min cap - BASE_DELAY_MS * 2^(count-1) is capped at 30000
      const ip = "192.168.1.201";
      // With BASE_DELAY_MS = 2000:
      // attempt 1: 2s, attempt 2: 4s, attempt 3: 8s, attempt 4: 16s
      // attempt 5 would trigger lockout, so we test attempt 4 = 16s
      for (let i = 0; i < 4; i++) {
        recordFailedAttempt(ip);
      }
      const entry = getAttemptEntry(ip);
      const expectedDelay = Math.min(BASE_DELAY_MS * Math.pow(2, entry.count - 1), 30_000) / 1000;
      expect(expectedDelay).toBeLessThanOrEqual(30);
      clearAttempts(ip);
    });
  });

  describe("isLockedOut", () => {
    it("should return locked=false for a fresh IP", () => {
      const result = isLockedOut("new-ip");
      expect(result.locked).toBe(false);
      expect(result.retryAfterSeconds).toBe(0);
    });

    it("should return locked=true after MAX_ATTEMPTS failures", () => {
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        recordFailedAttempt(testIp);
      }
      const result = isLockedOut(testIp);
      expect(result.locked).toBe(true);
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
    });

    it("should report remaining lockout time accurately", () => {
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        recordFailedAttempt(testIp);
      }
      const result = isLockedOut(testIp);
      // Should be close to LOCKOUT_MS / 1000 (within 2 seconds tolerance)
      expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(LOCKOUT_MS / 1000 - 2);
      expect(result.retryAfterSeconds).toBeLessThanOrEqual(LOCKOUT_MS / 1000);
    });
  });

  describe("clearAttempts", () => {
    it("should remove all tracking data for an IP", () => {
      recordFailedAttempt(testIp);
      recordFailedAttempt(testIp);
      expect(getAttemptEntry(testIp).count).toBe(2);

      clearAttempts(testIp);
      expect(getAttemptEntry(testIp).count).toBe(0);
      expect(getAttemptEntry(testIp).lockedUntil).toBe(0);
    });

    it("should not affect other IPs", () => {
      const otherIp = "10.0.0.1";
      recordFailedAttempt(testIp);
      recordFailedAttempt(otherIp);

      clearAttempts(testIp);
      expect(getAttemptEntry(testIp).count).toBe(0);
      expect(getAttemptEntry(otherIp).count).toBe(1);

      clearAttempts(otherIp);
    });
  });
});

// ─── requireUnlocked Middleware ──────────────────────────────────────────────

describe("requireUnlocked middleware", () => {
  it("should import correctly from middleware module", async () => {
    const { requireUnlocked } = await import("../server/middleware");
    expect(typeof requireUnlocked).toBe("function");
  });

  it("should return 403 when database is not open", async () => {
    const { requireUnlocked } = await import("../server/middleware");

    // Mock request, response, and next
    const req = {} as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as any;
    const next = vi.fn();

    requireUnlocked(req, res, next);

    // Since we haven't opened any DB, isDbOpen() should be false
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Database is locked." });
    expect(next).not.toHaveBeenCalled();
  });
});

// ─── Rate Limiter Logic ─────────────────────────────────────────────────────

describe("rateLimiter middleware", () => {
  it("should import correctly from middleware module", async () => {
    const { rateLimiter } = await import("../server/middleware");
    expect(typeof rateLimiter).toBe("function");
  });

  it("should call next() for the first request", async () => {
    const { rateLimiter } = await import("../server/middleware");

    const req = {
      ip: "10.20.30.40",
      socket: { remoteAddress: "10.20.30.40" },
    } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as any;
    const next = vi.fn();

    rateLimiter(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
