/**
 * server.ts — Nexus Application Entry Point
 *
 * Slim orchestrator: sets up Express, mounts router modules,
 * handles autologin migration, and starts the Vite dev server.
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// ─── Server modules ──────────────────────────────────────────────────────────
import {
  dbFileExists, openDatabase, initTables, setSessionKey,
  BACKUP_DIR, AUTOLOGIN_PATH,
} from "./server/db.js";
import { loadAutologinKey, migrateFromFile } from "./server/keychainStore.js";

// ─── Route modules ───────────────────────────────────────────────────────────
import authRouter from "./server/routes/auth.js";
import tasksRouter from "./server/routes/tasks.js";
import tagsRouter from "./server/routes/tags.js";
import notesRouter from "./server/routes/notes.js";
import goalsRouter from "./server/routes/goals.js";
import alarmsRouter from "./server/routes/alarms.js";
import pomodoroRouter from "./server/routes/pomodoro.js";
import settingsRouter from "./server/routes/settings.js";
import statsRouter from "./server/routes/stats.js";
import backupsRouter, { startAutoBackupScheduler } from "./server/routes/backups.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─────────────────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────────────────
async function startServer() {
  // ─── AUTOLOGIN: migrate from file → OS Keychain if needed ─────────────────
  if (fs.existsSync(AUTOLOGIN_PATH)) {
    console.log("[Auth] Found legacy autologin file. Migrating to OS Keychain...");
    await migrateFromFile(AUTOLOGIN_PATH);
  }

  // ─── AUTOLOGIN: attempt unlock from OS Keychain ───────────────────────────
  if (dbFileExists()) {
    try {
      const storedKey = await loadAutologinKey();
      if (storedKey && storedKey.length === 32) {
        if (openDatabase(storedKey)) {
          setSessionKey(storedKey);
          initTables();
          console.log("[Auth] Autologin successful (OS Keychain). Database unlocked.");
        } else {
          console.warn("[Auth] Autologin failed (invalid key in Keychain).");
        }
      }
    } catch (e) {
      console.error("[Auth] Autologin error:", e);
    }
  }

  // ─── EXPRESS APP ──────────────────────────────────────────────────────────
  const app = express();
  app.use(express.json());

  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);

  // ─── MOUNT ROUTERS ─────────────────────────────────────────────────────────
  app.use("/api/auth",     authRouter);
  app.use("/api/tasks",    tasksRouter);
  app.use("/api/tags",     tagsRouter);
  app.use("/api/notes",    notesRouter);
  app.use("/api/goals",    goalsRouter);
  app.use("/api/alarms",   alarmsRouter);
  app.use("/api/pomodoro", pomodoroRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/stats",    statsRouter);
  app.use("/api/backups",  backupsRouter);

  // ─── AUTO-BACKUP SCHEDULER ────────────────────────────────────────────────
  startAutoBackupScheduler();

  // ─── VITE INTEGRATION ────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(3000, "0.0.0.0", () => {
    console.log("╔═══════════════════════════════════════════════════════════╗");
    console.log("║  NEXUS Server running on http://localhost:3000           ║");
    console.log("║  Security: Master Password (Argon2id + SQLCipher 4)     ║");
    console.log("║  Key Storage: RAM-only (Zero Knowledge)                 ║");
    console.log("║  Autologin:  OS Keychain (DPAPI on Windows)             ║");
    console.log("╚═══════════════════════════════════════════════════════════╝");
  });
}

startServer();
