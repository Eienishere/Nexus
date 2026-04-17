/**
 * keyUtils.ts — Nexus Master Password Key Derivation
 *
 * Uses Argon2id (industry standard memory-hard KDF) to derive a 256-bit
 * encryption key from the user's master password + a unique per-installation salt.
 *
 * Security parameters (OWASP recommended minimums for Argon2id):
 *   - memoryCost : 64 MB
 *   - timeCost   : 3 iterations
 *   - parallelism: 4 lanes
 *   - outputLen  : 32 bytes (256-bit key for AES-256 / SQLCipher)
 */

import { hashRaw } from "@node-rs/argon2";
import crypto from "crypto";
import fs from "fs";

// ─── Argon2id parameters ────────────────────────────────────────────────────
const ARGON2_PARAMS = {
  algorithm: 2, // 2 is Argon2id
  memoryCost: 65536,  // 64 MB
  timeCost: 3,
  parallelism: 4,
  outputLen: 32,      // 256-bit → 32 bytes
};

/** Generate a cryptographically random 32-byte salt. */
export function generateSalt(): Buffer {
  return crypto.randomBytes(32);
}

/**
 * Load the salt from disk, or generate+save a new one if this is a fresh install.
 * The salt file is NOT secret — its purpose is uniqueness, not confidentiality.
 */
export function getOrCreateSalt(saltPath: string): Buffer {
  if (fs.existsSync(saltPath)) {
    const raw = fs.readFileSync(saltPath);
    if (raw.length !== 32) {
      throw new Error("[KeyUtils] Salt file is corrupted (wrong length). Delete nexus_salt.bin and restart.");
    }
    return raw;
  }
  // First run: generate and persist a fresh salt
  const salt = generateSalt();
  fs.writeFileSync(saltPath, salt, { mode: 0o600 }); // owner-read-write only
  console.log("[KeyUtils] New installation salt generated and saved.");
  return salt;
}

/**
 * Derive a 256-bit AES key from the user's master password using Argon2id.
 *
 * @param password  Raw master password string (UTF-8)
 * @param salt      Per-installation 32-byte salt buffer
 * @returns         A 32-byte Buffer suitable for SQLCipher / AES-256-GCM
 */
export async function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  // @node-rs/argon2 expects salt as Buffer
  const rawHash = await hashRaw(password, {
    ...ARGON2_PARAMS,
    salt,
  });
  return Buffer.from(rawHash);
}

/**
 * Securely wipe a Buffer from memory by overwriting with zeros.
 * Call this as soon as the key is no longer needed in the JS layer.
 */
export function wipeBuffer(buf: Buffer | null | undefined): void {
  if (buf) buf.fill(0);
}
