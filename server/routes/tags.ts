/**
 * routes/tags.ts — Tag CRUD
 */

import { Router } from "express";
import { getDb } from "../db.js";
import { requireUnlocked } from "../middleware.js";

const router = Router();

router.get("/", requireUnlocked, (req, res) => {
  res.json(getDb().prepare("SELECT * FROM tags").all());
});

router.post("/", requireUnlocked, (req, res) => {
  const { id, name, color } = req.body;
  getDb().prepare(`INSERT INTO tags (id, name, color) VALUES (?, ?, ?)`).run(id, name, color);
  res.status(201).json({ success: true });
});

router.patch("/:id", requireUnlocked, (req, res) => {
  const d = getDb();
  const { name, color } = req.body;
  const updates: string[] = [];
  const params: any[] = [];
  if (name  !== undefined) { updates.push("name = ?");  params.push(name);  }
  if (color !== undefined) { updates.push("color = ?"); params.push(color); }
  if (updates.length > 0) { params.push(req.params.id); d.prepare(`UPDATE tags SET ${updates.join(", ")} WHERE id = ?`).run(...params); }
  res.json({ success: true });
});

router.delete("/:id", requireUnlocked, (req, res) => {
  const d = getDb();
  d.prepare("DELETE FROM task_tags WHERE tag_id = ?").run(req.params.id);
  d.prepare("DELETE FROM tags WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

export default router;
