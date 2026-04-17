/**
 * routes/auth.ts — Authentication Endpoints
 *
 * Handles: status, setup, unlock, lock, change-password, factory-reset, autologin
 */

import { Router } from "express";
import fs from "fs";

import { getOrCreateSalt, deriveKey, wipeBuffer } from "../keyUtils.js";
import {
  getDb, dbFileExists, openDatabase, initTables,
  clearSession, getSessionKey, setSessionKey,
  isResetPending, setResetPending,
  SALT_PATH, tryDeleteFiles, performFactoryReset, DB_PATH,
  secureDelete,
} from "../db.js";
import {
  isLockedOut, recordFailedAttempt, clearAttempts,
  requireUnlocked,
} from "../middleware.js";
import {
  saveAutologinKey, loadAutologinKey, deleteAutologinKey,
  isAutologinEnabled,
} from "../keychainStore.js";

const router = Router();

/** Status: tells the frontend what screen to show. */
router.get("/status", async (_req, res) => {
  const firstRun = isResetPending() || !dbFileExists() || !fs.existsSync(SALT_PATH);
  const autologin = !firstRun && await isAutologinEnabled();
  res.json({
    isFirstRun: firstRun,
    isLocked:   firstRun ? true : !getSessionKey(),
    autologinEnabled: autologin,
  });
});

/**
 * SETUP — called once on first run.
 * Creates the salt, derives the key, creates + encrypts the DB.
 */
router.post("/setup", async (req, res) => {
  const { password } = req.body as { password?: string };
  if (!password || password.length < 8) {
    res.status(400).json({ error: "Şifre en az 8 karakter olmalıdır." });
    return;
  }
  if (getSessionKey()) {
    res.status(409).json({ error: "Zaten bir oturum açık." });
    return;
  }

  try {
    if (isResetPending()) {
      tryDeleteFiles();
    }

    try { fs.unlinkSync(SALT_PATH); } catch {}

    const salt = getOrCreateSalt(SALT_PATH);
    const key  = await deriveKey(password, salt);

    try { fs.unlinkSync(DB_PATH); } catch {}
    try { fs.unlinkSync(DB_PATH + "-wal"); } catch {}
    try { fs.unlinkSync(DB_PATH + "-shm"); } catch {}
    try { fs.unlinkSync(DB_PATH + "-journal"); } catch {}

    const Database = (await import("better-sqlite3-multiple-ciphers")).default;
    const newDb = new Database(DB_PATH);
    newDb.pragma(`key="x'${key.toString("hex")}'"`);
    newDb.pragma("cipher='sqlcipher'");
    newDb.pragma("legacy=4");

    // Manually set db via openDatabase-like logic — we need to set it through db module
    // Since we have the DB object, we need a way to set it. Use openDatabase approach:
    // Close candidate, write to disk, then open via openDatabase
    newDb.prepare("SELECT count(*) FROM sqlite_master").get();

    // We already have a valid DB, but we should use the db module's functions
    // Let's close this and re-open through the standard path
    newDb.close();

    const success = openDatabase(key);
    if (!success) {
      throw new Error("Failed to open newly created database");
    }

    setSessionKey(key);
    setResetPending(false);
    initTables();

    console.log("[Auth] Setup complete. Master Password established.");
    res.json({ success: true });
  } catch (err: any) {
    wipeBuffer(getSessionKey());
    setSessionKey(null);
    clearSession();
    console.error("[Auth] Setup error:", err);
    res.status(500).json({ error: "Kurulum başarısız: " + err.message });
  }
});

/**
 * UNLOCK — normal login with brute-force protection.
 */
router.post("/unlock", async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const { password } = req.body as { password?: string };

  const lockStatus = isLockedOut(ip);
  if (lockStatus.locked) {
    res.status(429).json({
      error: `Çok fazla hatalı deneme. ${lockStatus.retryAfterSeconds} saniye bekleyin.`,
      retryAfterSeconds: lockStatus.retryAfterSeconds,
    });
    return;
  }

  if (!password) {
    res.status(400).json({ error: "Şifre boş olamaz." });
    return;
  }
  if (!dbFileExists()) {
    res.status(404).json({ error: "Veritabanı bulunamadı. Kurulum gerekli." });
    return;
  }

  try {
    const salt = getOrCreateSalt(SALT_PATH);
    const key  = await deriveKey(password, salt);

    const success = openDatabase(key);

    if (!success) {
      wipeBuffer(key);
      const result = recordFailedAttempt(ip);
      if (result.locked) {
        res.status(429).json({
          error: `Çok fazla hatalı deneme. ${result.retryAfterSeconds} saniye kilitlendiniz.`,
          retryAfterSeconds: result.retryAfterSeconds,
        });
      } else {
        res.status(401).json({
          error: "Yanlış şifre.",
          retryAfterSeconds: result.retryAfterSeconds,
        });
      }
      return;
    }

    clearAttempts(ip);
    setSessionKey(key);
    initTables();
    console.log("[Auth] Database unlocked successfully.");
    res.json({ success: true });
  } catch (err: any) {
    console.error("[Auth] Unlock error:", err);
    res.status(500).json({ error: "Giriş hatası: " + err.message });
  }
});

/** LOCK — clear session, wipe key from RAM. */
router.post("/lock", (_req, res) => {
  clearSession();
  console.log("[Auth] Session locked. Key wiped from memory.");
  res.json({ success: true });
});

/**
 * CHANGE PASSWORD — rekeying the DB with a new Argon2id-derived key.
 */
router.post("/change-password", requireUnlocked, async (req, res) => {
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Mevcut ve yeni şifre gereklidir." });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: "Yeni şifre en az 8 karakter olmalıdır." });
    return;
  }

  try {
    const salt       = getOrCreateSalt(SALT_PATH);
    const currentKey = await deriveKey(currentPassword, salt);
    const currentHex = currentKey.toString("hex");
    wipeBuffer(currentKey);

    const sk = getSessionKey();
    if (!sk || sk.toString("hex") !== currentHex) {
      res.status(401).json({ error: "Mevcut şifre yanlış." });
      return;
    }

    const newKey    = await deriveKey(newPassword, salt);
    const newKeyHex = newKey.toString("hex");

    const d = getDb();
    d.pragma(`rekey="x'${newKeyHex}'"`);

    wipeBuffer(sk);
    setSessionKey(newKey);

    console.log("[Auth] Master Password changed successfully.");
    res.json({ success: true });
  } catch (err: any) {
    console.error("[Auth] Change password error:", err);
    res.status(500).json({ error: "Şifre değiştirilirken hata: " + err.message });
  }
});

/**
 * FACTORY RESET — destroy all data.
 */
router.post("/factory-reset", async (req, res) => {
  const { confirm } = req.body as { confirm?: string };
  if (confirm !== "NEXUS_FACTORY_RESET") {
    res.status(400).json({ error: "Geçersiz onay kodu." });
    return;
  }
  try {
    await performFactoryReset();
    res.json({ success: true, message: "Tüm veriler silindi. Uygulama yeniden başlatılıyor." });
  } catch (err: any) {
    res.status(500).json({ error: "Sıfırlama başarısız: " + err.message });
  }
});

/**
 * AUTOLOGIN TOGGLE — uses OS Keychain instead of file storage.
 */
router.post("/autologin", requireUnlocked, async (req, res) => {
  const { enable, password } = req.body as { enable: boolean; password?: string };

  if (!enable) {
    await deleteAutologinKey();
    res.json({ success: true, enabled: false });
    return;
  }

  if (!password) {
    res.status(400).json({ error: "Şifre gereklidir." });
    return;
  }

  try {
    const salt = getOrCreateSalt(SALT_PATH);
    const key  = await deriveKey(password, salt);
    const keyHex = key.toString("hex");

    const sk = getSessionKey();
    if (!sk || sk.toString("hex") !== keyHex) {
      wipeBuffer(key);
      res.status(401).json({ error: "Master şifre yanlış." });
      return;
    }

    // Save to OS Keychain instead of file
    await saveAutologinKey(key);
    wipeBuffer(key);

    console.log("[Auth] Autologin enabled. Key saved to OS Keychain.");
    res.json({ success: true, enabled: true });
  } catch (err: any) {
    res.status(500).json({ error: "Otomatik giriş aktifleştirilemedi: " + err.message });
  }
});

export default router;
