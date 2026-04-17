/**
 * routes/alarms.ts — Alarms CRUD
 */

import { Router } from "express";
import { getDb } from "../db.js";
import { requireUnlocked } from "../middleware.js";

const router = Router();

router.get("/", requireUnlocked, (req, res) => {
  const alarms = getDb().prepare("SELECT * FROM alarms").all();
  res.json(alarms.map((a: any) => ({ ...a, active: a.active === 1, days: JSON.parse(a.days || "[]") })));
});

router.post("/", requireUnlocked, (req, res) => {
  const { id, time, label, active, days } = req.body;
  getDb().prepare(`INSERT INTO alarms (id, time, label, active, days) VALUES (?, ?, ?, ?, ?)`)
         .run(id, time, label, active ? 1 : 0, JSON.stringify(days || []));
  res.status(201).json({ success: true });
});

router.patch("/:id", requireUnlocked, (req, res) => {
  const d = getDb();
  const { time, label, active, days } = req.body;
  const updates: string[] = []; const params: any[] = [];
  if (time   !== undefined) { updates.push("time = ?");   params.push(time); }
  if (label  !== undefined) { updates.push("label = ?");  params.push(label); }
  if (active !== undefined) { updates.push("active = ?"); params.push(active ? 1 : 0); }
  if (days   !== undefined) { updates.push("days = ?");   params.push(JSON.stringify(days)); }
  if (updates.length > 0) { params.push(req.params.id); d.prepare(`UPDATE alarms SET ${updates.join(", ")} WHERE id = ?`).run(...params); }
  res.json({ success: true });
});

router.delete("/:id", requireUnlocked, (req, res) => {
  getDb().prepare("DELETE FROM alarms WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

export default router;
