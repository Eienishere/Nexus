/**
 * routes/pomodoro.ts — Pomodoro Session Recording
 */

import { Router } from "express";
import { getDb } from "../db.js";
import { requireUnlocked } from "../middleware.js";

const router = Router();

router.post("/", requireUnlocked, (req, res) => {
  const { id, task_id, start_time, end_time, type, was_completed } = req.body;
  getDb().prepare(`INSERT INTO pomodoro_sessions (id, task_id, start_time, end_time, type, was_completed) VALUES (?, ?, ?, ?, ?, ?)`)
         .run(id, task_id, start_time, end_time, type, was_completed ? 1 : 0);
  res.status(201).json({ success: true });
});

export default router;
