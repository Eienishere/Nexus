/**
 * routes/notes.ts — Notes CRUD + Note-Tag Associations
 */

import { Router } from "express";
import { getDb } from "../db.js";
import { requireUnlocked } from "../middleware.js";

const router = Router();

router.get("/", requireUnlocked, (req, res) => {
  const d = getDb();
  const notes = d.prepare("SELECT * FROM notes ORDER BY updated_at DESC").all() as any[];
  const notesWithTags = notes.map(note => {
    const tags = d.prepare(`
      SELECT t.* FROM tags t JOIN note_tags nt ON t.id = nt.tag_id WHERE nt.note_id = ?
    `).all(note.id);
    return { ...note, is_pinned: !!note.is_pinned, is_starred: !!note.is_starred, is_archived: !!note.is_archived, tags };
  });
  res.json(notesWithTags);
});

router.post("/", requireUnlocked, (req, res) => {
  const d = getDb();
  const { id, title, content, color, is_pinned, is_starred, is_archived, tags } = req.body;
  d.prepare(`INSERT INTO notes (id, title, content, color, is_pinned, is_starred, is_archived) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(id, title, content, color, is_pinned ? 1 : 0, is_starred ? 1 : 0, is_archived ? 1 : 0);
  if (tags && Array.isArray(tags)) {
    const stmt = d.prepare("INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)");
    tags.forEach((tagId: string) => { try { stmt.run(id, tagId); } catch {} });
  }
  res.status(201).json({ success: true });
});

router.put("/:id", requireUnlocked, (req, res) => {
  const { title, content, color, is_pinned, is_starred, is_archived } = req.body;
  getDb().prepare(`UPDATE notes SET title = ?, content = ?, color = ?, is_pinned = ?, is_starred = ?, is_archived = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
         .run(title, content, color, is_pinned ? 1 : 0, is_starred ? 1 : 0, is_archived ? 1 : 0, req.params.id);
  res.json({ success: true });
});

router.delete("/:id", requireUnlocked, (req, res) => {
  getDb().prepare("DELETE FROM notes WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// ─── NOTE-TAG ASSOCIATIONS ────────────────────────────────────────────────────

router.post("/:id/tags", requireUnlocked, (req, res) => {
  try { getDb().prepare(`INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)`).run(req.params.id, req.body.tag_id); } catch {}
  res.json({ success: true });
});

router.delete("/:id/tags/:tagId", requireUnlocked, (req, res) => {
  getDb().prepare("DELETE FROM note_tags WHERE note_id = ? AND tag_id = ?").run(req.params.id, req.params.tagId);
  res.json({ success: true });
});

export default router;
