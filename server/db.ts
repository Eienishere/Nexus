/**
 * db.ts — Database Session Management & Helpers
 *
 * Centralizes all database state, session key management, table initialization,
 * encrypted backup creation, secure deletion, and factory reset logic.
 */

import Database from "better-sqlite3-multiple-ciphers";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { wipeBuffer } from "./keyUtils.js";
import { deleteAutologinKey } from "./keychainStore.js";

// ─── Paths ────────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

export const DB_PATH    = path.join(PROJECT_ROOT, "nexus.db");
export const SALT_PATH  = path.join(PROJECT_ROOT, "nexus_salt.bin");
export const BACKUP_DIR = path.join(PROJECT_ROOT, "backups");

// Legacy constant — kept for migration, will be removed after all references are cleaned
export const AUTOLOGIN_PATH = path.join(PROJECT_ROOT, "nexus_autologin.bin");

// ─── Session State — Zero-Knowledge: key lives only in RAM ────────────────────

let sessionKey: Buffer | null = null;
let db: Database.Database | null = null;
let resetPending = false;

// ─── Getters / Setters ───────────────────────────────────────────────────────

export function getSessionKey(): Buffer | null {
  return sessionKey;
}

export function setSessionKey(key: Buffer | null): void {
  sessionKey = key;
}

export function isResetPending(): boolean {
  return resetPending;
}

export function setResetPending(value: boolean): void {
  resetPending = value;
}

/** Return the live DB instance; throws if not unlocked. */
export function getDb(): Database.Database {
  if (!db) throw new Error("Database is locked. Please unlock first.");
  return db;
}

/** Check if a DB connection is open. */
export function isDbOpen(): boolean {
  return db !== null;
}

// ─── Database Operations ──────────────────────────────────────────────────────

/** Returns true if the DB file exists on disk. */
export function dbFileExists(): boolean {
  return fs.existsSync(DB_PATH);
}

/**
 * Attempt to open (or create) the SQLite database with the given 32-byte key.
 * Returns true if the key is correct, false if decryption fails.
 */
export function openDatabase(key: Buffer): boolean {
  try {
    const candidate = new Database(DB_PATH);
    candidate.pragma(`key="x'${key.toString("hex")}'"`);
    candidate.pragma("cipher='sqlcipher'");
    candidate.pragma("legacy=4");
    candidate.prepare("SELECT count(*) FROM sqlite_master").get();
    // Key is valid — promote to session
    if (db) { try { db.close(); } catch {} }
    db = candidate;
    return true;
  } catch {
    return false;
  }
}

/** Initialize all application tables on a freshly-opened DB. */
export function initTables(): void {
  const d = getDb();
  d.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'Todo',
      priority TEXT DEFAULT 'Medium',
      due_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      is_starred INTEGER DEFAULT 0,
      project_id TEXT,
      tags TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS pomodoro_sessions (
      id TEXT PRIMARY KEY,
      task_id TEXT,
      start_time TEXT,
      end_time TEXT,
      type TEXT,
      was_completed INTEGER
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT,
      content TEXT,
      color TEXT,
      is_pinned INTEGER DEFAULT 0,
      is_starred INTEGER DEFAULT 0,
      is_archived INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      title TEXT,
      target_value REAL,
      current_value REAL,
      start_value REAL DEFAULT 0,
      unit TEXT,
      deadline TEXT,
      category TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS alarms (
      id TEXT PRIMARY KEY,
      time TEXT NOT NULL,
      label TEXT,
      active INTEGER DEFAULT 1,
      days TEXT
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6366f1'
    );

    CREATE TABLE IF NOT EXISTS task_tags (
      task_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (task_id, tag_id),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS note_tags (
      note_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (note_id, tag_id),
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
  `);

  // Migrate: add start_value if missing
  try { d.exec("ALTER TABLE goals ADD COLUMN start_value REAL DEFAULT 0;"); } catch {}
  
  // Migrate: add is_starred and is_archived to notes if missing
  try { d.exec("ALTER TABLE notes ADD COLUMN is_starred INTEGER DEFAULT 0;"); } catch {}
  try { d.exec("ALTER TABLE notes ADD COLUMN is_archived INTEGER DEFAULT 0;"); } catch {}
}

// ─── Session Lifecycle ────────────────────────────────────────────────────────

/** Wipe key + close DB — called on lock, exit, and SIGINT. */
export function clearSession(): void {
  wipeBuffer(sessionKey);
  sessionKey = null;
  if (db) { try { db.close(); } catch {} db = null; }
}

// Process cleanup handlers
process.on("exit",   () => clearSession());
process.on("SIGINT", () => { clearSession(); process.exit(0); });
process.on("SIGTERM",() => { clearSession(); process.exit(0); });

// ─── Encrypted Backup ─────────────────────────────────────────────────────────

export async function createEncryptedBackup(targetDir: string): Promise<string> {
  if (!sessionKey) throw new Error("No active session key.");
  const d = getDb();

  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  const now  = new Date();
  const pad  = (n: number) => n.toString().padStart(2, "0");
  const ts   = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
  const encPath = path.join(targetDir, `nexus_backup_${ts}.enc`);

  const tempPath = path.join(targetDir, `_tmp_backup_${Date.now()}.db`);
  await d.backup(tempPath);

  try {
    const raw = fs.readFileSync(tempPath);
    const iv  = crypto.randomBytes(12);
    const keyCopy = Buffer.from(sessionKey);
    const cipher  = crypto.createCipheriv("aes-256-gcm", keyCopy, iv);
    const encrypted = Buffer.concat([cipher.update(raw), cipher.final()]);
    const authTag   = cipher.getAuthTag();
    wipeBuffer(keyCopy);

    fs.writeFileSync(encPath, Buffer.concat([iv, authTag, encrypted]));
    console.log(`[Backup] Encrypted backup: ${encPath} (${encrypted.length + 28} bytes)`);
  } finally {
    if (fs.existsSync(tempPath)) {
      const size = fs.statSync(tempPath).size;
      fs.writeFileSync(tempPath, crypto.randomBytes(size));
      fs.unlinkSync(tempPath);
    }
  }

  return encPath;
}

// ─── Secure Deletion ──────────────────────────────────────────────────────────

export function secureDelete(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  try {
    const size = fs.statSync(filePath).size;
    const fd   = fs.openSync(filePath, "r+");
    const chunk = 65536;
    let written = 0;
    while (written < size) {
      const toWrite = Math.min(chunk, size - written);
      fs.writeSync(fd, crypto.randomBytes(toWrite), 0, toWrite, written);
      written += toWrite;
    }
    fs.closeSync(fd);
    fs.unlinkSync(filePath);
    console.log(`[FactoryReset] Wiped: ${filePath}`);
  } catch (e) {
    console.error(`[FactoryReset] Could not wipe ${filePath}:`, e);
    try { fs.unlinkSync(filePath); } catch {}
  }
}

/** Best-effort deletion helper (Windows may hold file locks after db.close). */
export function tryDeleteFiles(): void {
  const coreFiles = [
    DB_PATH,
    DB_PATH + "-wal",
    DB_PATH + "-shm",
    DB_PATH + "-journal",
    SALT_PATH,
    AUTOLOGIN_PATH,
  ];
  for (const f of coreFiles) {
    secureDelete(f);
    try { fs.unlinkSync(f); } catch {}
  }
  // Wipe backups
  if (fs.existsSync(BACKUP_DIR)) {
    for (const f of fs.readdirSync(BACKUP_DIR)) {
      const fp = path.join(BACKUP_DIR, f);
      secureDelete(fp);
      try { fs.unlinkSync(fp); } catch {}
    }
  }
}

// ─── Factory Reset ────────────────────────────────────────────────────────────

export async function performFactoryReset(): Promise<void> {
  clearSession();
  resetPending = true;
  tryDeleteFiles();
  // Also wipe from OS keychain
  try { await deleteAutologinKey(); } catch {}
  console.log("[FactoryReset] Reset pending. Files cleaned (best-effort on Windows).");
}
