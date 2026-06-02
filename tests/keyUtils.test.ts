/**
 * keyUtils.test.ts — Unit tests for the Nexus Key Derivation module
 *
 * Tests: generateSalt, getOrCreateSalt, deriveKey, wipeBuffer
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { generateSalt, getOrCreateSalt, deriveKey, wipeBuffer } from "../server/keyUtils";

// Use a temporary directory for salt file tests
const TEST_DIR = path.join(os.tmpdir(), `nexus-test-${Date.now()}`);
const TEST_SALT_PATH = path.join(TEST_DIR, "test_salt.bin");

beforeEach(() => {
  if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  // Clean up test files
  try { fs.rmSync(TEST_DIR, { recursive: true, force: true }); } catch {}
});

// ─── generateSalt ─────────────────────────────────────────────────────────────

describe("generateSalt", () => {
  it("should return a 32-byte Buffer", () => {
    const salt = generateSalt();
    expect(Buffer.isBuffer(salt)).toBe(true);
    expect(salt.length).toBe(32);
  });

  it("should produce different salts on each call", () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    expect(salt1.equals(salt2)).toBe(false);
  });
});

// ─── getOrCreateSalt ──────────────────────────────────────────────────────────

describe("getOrCreateSalt", () => {
  it("should create a new salt file when none exists", () => {
    expect(fs.existsSync(TEST_SALT_PATH)).toBe(false);
    const salt = getOrCreateSalt(TEST_SALT_PATH);
    expect(Buffer.isBuffer(salt)).toBe(true);
    expect(salt.length).toBe(32);
    expect(fs.existsSync(TEST_SALT_PATH)).toBe(true);
  });

  it("should return the same salt on subsequent reads", () => {
    const salt1 = getOrCreateSalt(TEST_SALT_PATH);
    const salt2 = getOrCreateSalt(TEST_SALT_PATH);
    expect(salt1.equals(salt2)).toBe(true);
  });

  it("should reject a corrupted salt file (wrong length)", () => {
    // Write a 16-byte file instead of 32
    fs.writeFileSync(TEST_SALT_PATH, Buffer.alloc(16));
    expect(() => getOrCreateSalt(TEST_SALT_PATH)).toThrow("corrupted");
  });
});

// ─── deriveKey ────────────────────────────────────────────────────────────────

describe("deriveKey", () => {
  it("should produce a 32-byte key", async () => {
    const salt = generateSalt();
    const key = await deriveKey("MyTestPassword", salt);
    expect(Buffer.isBuffer(key)).toBe(true);
    expect(key.length).toBe(32);
  });

  it("should be deterministic (same password + salt → same key)", async () => {
    const salt = generateSalt();
    const key1 = await deriveKey("DeterministicTest", salt);
    const key2 = await deriveKey("DeterministicTest", salt);
    expect(key1.equals(key2)).toBe(true);
  });

  it("should produce different keys for different passwords", async () => {
    const salt = generateSalt();
    const key1 = await deriveKey("PasswordOne", salt);
    const key2 = await deriveKey("PasswordTwo", salt);
    expect(key1.equals(key2)).toBe(false);
  });

  it("should produce different keys for different salts", async () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    const key1 = await deriveKey("SamePassword", salt1);
    const key2 = await deriveKey("SamePassword", salt2);
    expect(key1.equals(key2)).toBe(false);
  });
});

// ─── wipeBuffer ───────────────────────────────────────────────────────────────

describe("wipeBuffer", () => {
  it("should zero-fill a buffer", () => {
    const buf = Buffer.from([0xDE, 0xAD, 0xBE, 0xEF, 0xCA, 0xFE]);
    wipeBuffer(buf);
    expect(buf.every(byte => byte === 0)).toBe(true);
  });

  it("should handle null safely", () => {
    expect(() => wipeBuffer(null)).not.toThrow();
  });

  it("should handle undefined safely", () => {
    expect(() => wipeBuffer(undefined)).not.toThrow();
  });

  it("should wipe a 32-byte key buffer completely", () => {
    const key = Buffer.alloc(32, 0xFF);
    wipeBuffer(key);
    const zeros = Buffer.alloc(32, 0x00);
    expect(key.equals(zeros)).toBe(true);
  });
});
