/**
 * routes/backups.ts — Encrypted Backup Management + Auto-backup Scheduler
 */

import { Router } from "express";
import path from "path";
import fs from "fs";

import { getDb, createEncryptedBackup, BACKUP_DIR, getSessionKey, isDbOpen } from "../db.js";
import { requireUnlocked, rateLimiter } from "../middleware.js";

const router = Router();

router.post("/create", requireUnlocked, rateLimiter, async (req, res) => {
  try {
    const { targetPath } = req.body;
    const targetDir = targetPath && typeof targetPath === "string"
      ? path.resolve(targetPath)
      : BACKUP_DIR;
    const filePath = await createEncryptedBackup(targetDir);
    res.json({ success: true, filePath, fileName: path.basename(filePath) });
  } catch (err: any) {
    console.error("[Backup Error]", err);
    res.status(500).json({ error: "Backup başarısız: " + err.message });
  }
});

// ─── Auto-backup Scheduler ────────────────────────────────────────────────────

export function startAutoBackupScheduler(): void {
  setInterval(async () => {
    if (!isDbOpen() || !getSessionKey()) return;
    const d = getDb();
    const freqSetting = d.prepare("SELECT value FROM settings WHERE key = 'backup_frequency'").get() as any;
    if (!freqSetting || freqSetting.value === "none") return;

    const lastBackupSetting = d.prepare("SELECT value FROM settings WHERE key = 'last_backup'").get() as any;
    const lastBackupTime = lastBackupSetting ? parseInt(lastBackupSetting.value, 10) : 0;
    const now = Date.now();
    const diffHours = (now - lastBackupTime) / (1000 * 60 * 60);

    let shouldBackup = false;
    if (freqSetting.value === "hourly"  && diffHours >= 1)     shouldBackup = true;
    if (freqSetting.value === "daily"   && diffHours >= 24)    shouldBackup = true;
    if (freqSetting.value === "weekly"  && diffHours >= 24*7)  shouldBackup = true;
    if (freqSetting.value === "monthly" && diffHours >= 24*30) shouldBackup = true;

    if (shouldBackup) {
      try {
        const customPathSetting = d.prepare("SELECT value FROM settings WHERE key = 'backup_path'").get() as any;
        let targetDir = BACKUP_DIR;
        if (customPathSetting?.value) {
          try {
            if (!fs.existsSync(customPathSetting.value)) fs.mkdirSync(customPathSetting.value, { recursive: true });
            targetDir = customPathSetting.value;
          } catch {}
        }
        const filePath = await createEncryptedBackup(targetDir);
        d.prepare(`INSERT INTO settings (key, value) VALUES ('last_backup', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(now.toString());
        console.log(`[Backup] Auto backup: ${filePath}`);
      } catch (err) {
        console.error("[Backup Error]", err);
      }
    }
  }, 1000 * 60 * 5);
}

export default router;
