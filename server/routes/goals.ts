/**
 * routes/goals.ts — Goals CRUD
 */

import { Router } from "express";
import { getDb } from "../db.js";
import { requireUnlocked } from "../middleware.js";

const router = Router();

router.get("/", requireUnlocked, (req, res) => {
  res.json(getDb().prepare("SELECT * FROM goals").all());
});

router.post("/", requireUnlocked, (req, res) => {
  const { id, title, target_value, current_value, start_value, unit, deadline, category } = req.body;
  getDb().prepare(`INSERT INTO goals (id, title, target_value, current_value, start_value, unit, deadline, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
         .run(id, title, target_value, current_value, start_value || 0, unit, deadline, category);
  res.status(201).json({ success: true });
});

router.put("/:id", requireUnlocked, (req, res) => {
  getDb().prepare("UPDATE goals SET current_value = ? WHERE id = ?").run(req.body.current_value, req.params.id);
  res.json({ success: true });
});

router.delete("/:id", requireUnlocked, (req, res) => {
  getDb().prepare("DELETE FROM goals WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

export default router;
