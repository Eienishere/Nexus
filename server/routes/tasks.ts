/**
 * routes/tasks.ts — Task CRUD + Task-Tag Associations
 */

import { Router } from "express";
import { requireUnlocked } from "../middleware.js";
import { TaskRepository } from "../repositories/taskRepository.js";

const router = Router();

// ─── TASKS ────────────────────────────────────────────────────────────────────

router.get("/", requireUnlocked, (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
  const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
  
  const tasks = TaskRepository.getAll({ limit, offset });
  res.json(tasks);
});

router.post("/", requireUnlocked, (req, res) => {
  TaskRepository.create(req.body);
  res.status(201).json({ success: true });
});

router.patch("/:id", requireUnlocked, (req, res) => {
  TaskRepository.update(req.params.id, req.body);
  res.json({ success: true });
});

router.delete("/:id", requireUnlocked, (req, res) => {
  TaskRepository.delete(req.params.id);
  res.json({ success: true });
});

// ─── TASK-TAG ASSOCIATIONS ────────────────────────────────────────────────────

router.get("/:id/tags", requireUnlocked, (req, res) => {
  res.json(TaskRepository.getTags(req.params.id));
});

router.post("/:id/tags", requireUnlocked, (req, res) => {
  TaskRepository.addTag(req.params.id, req.body.tag_id);
  res.json({ success: true });
});

router.delete("/:id/tags/:tagId", requireUnlocked, (req, res) => {
  TaskRepository.removeTag(req.params.id, req.params.tagId);
  res.json({ success: true });
});

export default router;
