/**
 * routes/tasks.ts — Task CRUD + Task-Tag Associations
 */

import { Router } from "express";
import { getDb } from "../db.js";
import { requireUnlocked } from "../middleware.js";

const router = Router();

// ─── TASKS ────────────────────────────────────────────────────────────────────

router.get("/", requireUnlocked, (req, res) => {
  const d = getDb();
  const tasks = d.prepare("SELECT * FROM tasks ORDER BY created_at DESC").all() as any[];
  const tasksWithTags = tasks.map(task => {
    const tags = d.prepare(`
      SELECT t.* FROM tags t JOIN task_tags tt ON t.id = tt.tag_id WHERE tt.task_id = ?
    `).all(task.id);
    return { ...task, is_starred: !!task.is_starred, tags };
  });
  res.json(tasksWithTags);
});

router.post("/", requireUnlocked, (req, res) => {
  const d = getDb();
  const { id, title, description, priority, due_date, project_id, tags } = req.body;
  d.prepare(`INSERT INTO tasks (id, title, description, priority, due_date, project_id) VALUES (?, ?, ?, ?, ?, ?)`)
   .run(id, title, description, priority, due_date, project_id);
  if (tags && Array.isArray(tags)) {
    const stmt = d.prepare("INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)");
    tags.forEach((tagId: string) => { try { stmt.run(id, tagId); } catch {} });
  }
  res.status(201).json({ success: true });
});

router.patch("/:id", requireUnlocked, (req, res) => {
  const d = getDb();
  const { status, completed_at, is_starred, title, description, priority, due_date } = req.body;
  const updates: string[] = [];
  const params: any[] = [];

  if (status !== undefined)      { updates.push("status = ?");      params.push(status); }
  if (title !== undefined)       { updates.push("title = ?");       params.push(title); }
  if (description !== undefined) { updates.push("description = ?"); params.push(description); }
  if (priority !== undefined)    { updates.push("priority = ?");    params.push(priority); }
  if (due_date !== undefined)    { updates.push("due_date = ?");    params.push(due_date); }
  if (completed_at !== undefined) {
    if (completed_at === null) updates.push("completed_at = NULL");
    else { updates.push("completed_at = ?"); params.push(completed_at); }
  }
  if (is_starred !== undefined) { updates.push("is_starred = ?"); params.push(is_starred ? 1 : 0); }

  if (updates.length > 0) {
    params.push(req.params.id);
    d.prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`).run(...params);
  }
  res.json({ success: true });
});

router.delete("/:id", requireUnlocked, (req, res) => {
  getDb().prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// ─── TASK-TAG ASSOCIATIONS ────────────────────────────────────────────────────

router.get("/:id/tags", requireUnlocked, (req, res) => {
  res.json(getDb().prepare(`SELECT t.* FROM tags t JOIN task_tags tt ON t.id = tt.tag_id WHERE tt.task_id = ?`).all(req.params.id));
});

router.post("/:id/tags", requireUnlocked, (req, res) => {
  try { getDb().prepare(`INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)`).run(req.params.id, req.body.tag_id); } catch {}
  res.json({ success: true });
});

router.delete("/:id/tags/:tagId", requireUnlocked, (req, res) => {
  getDb().prepare("DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?").run(req.params.id, req.params.tagId);
  res.json({ success: true });
});

export default router;
