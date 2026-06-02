/**
 * routes/stats.ts — Summary Statistics
 */

import { Router } from "express";
import { getDb } from "../db.js";
import { requireUnlocked } from "../middleware.js";

const router = Router();

router.get("/summary", requireUnlocked, (req, res) => {
  const d = getDb();
  const taskCount = d.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'Done'").get();
  const pomoCount = d.prepare("SELECT COUNT(*) as count FROM pomodoro_sessions WHERE was_completed = 1").get();
  res.json({ completedTasks: (taskCount as any).count, pomodoros: (pomoCount as any).count });
});

export default router;
