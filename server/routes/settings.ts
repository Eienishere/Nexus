/**
 * routes/settings.ts — Application Settings
 */

import { Router } from "express";
import { getDb } from "../db.js";
import { requireUnlocked } from "../middleware.js";

const router = Router();

router.get("/", requireUnlocked, (req, res) => {
  const rows = getDb().prepare("SELECT * FROM settings").all();
  res.json(rows.reduce((acc: any, row: any) => { acc[row.key] = row.value; return acc; }, {}));
});

router.post("/", requireUnlocked, (req, res) => {
  const { key, value } = req.body;
  getDb().prepare(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`)
         .run(key, value);
  res.json({ success: true });
});

export default router;
