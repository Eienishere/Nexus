import { getDb } from "../db.js";

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export class TaskRepository {
  static getAll({ limit = 50, offset = 0 }: PaginationParams = {}) {
    const d = getDb();
    const tasks = d.prepare("SELECT * FROM tasks ORDER BY created_at DESC LIMIT ? OFFSET ?").all(limit, offset) as any[];
    
    if (tasks.length === 0) {
      return [];
    }

    // Pre-fetch all tags for these tasks to avoid N+1 problem
    const taskIds = tasks.map(t => t.id);
    const placeholders = taskIds.map(() => "?").join(",");
    
    const allTags = d.prepare(`
      SELECT tt.task_id, t.* 
      FROM tags t 
      JOIN task_tags tt ON t.id = tt.tag_id 
      WHERE tt.task_id IN (${placeholders})
    `).all(...taskIds) as any[];

    // Map tags to tasks
    const tagMap = new Map<string, any[]>();
    for (const tag of allTags) {
      if (!tagMap.has(tag.task_id)) {
        tagMap.set(tag.task_id, []);
      }
      tagMap.get(tag.task_id)!.push(tag);
    }

    return tasks.map(task => ({ 
      ...task, 
      is_starred: !!task.is_starred, 
      is_all_day: !!task.is_all_day, 
      tags: tagMap.get(task.id) || [] 
    }));
  }

  static create(data: any) {
    const d = getDb();
    const { id, title, description, priority, due_date, due_end_date, is_all_day, project_id, tags } = data;
    d.prepare(`INSERT INTO tasks (id, title, description, priority, due_date, due_end_date, is_all_day, project_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
     .run(id, title, description, priority, due_date, due_end_date || null, is_all_day ? 1 : 0, project_id);
     
    if (tags && Array.isArray(tags)) {
      const stmt = d.prepare("INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)");
      tags.forEach((tagId: string) => { try { stmt.run(id, tagId); } catch {} });
    }
  }

  static update(id: string, updatesData: any) {
    const d = getDb();
    const { status, completed_at, is_starred, title, description, priority, due_date, due_end_date, is_all_day } = updatesData;
    const updates: string[] = [];
    const params: any[] = [];

    if (status !== undefined)      { updates.push("status = ?");      params.push(status); }
    if (title !== undefined)       { updates.push("title = ?");       params.push(title); }
    if (description !== undefined) { updates.push("description = ?"); params.push(description); }
    if (priority !== undefined)    { updates.push("priority = ?");    params.push(priority); }
    if (due_date !== undefined)    { updates.push("due_date = ?");    params.push(due_date); }
    if (is_all_day !== undefined)  { updates.push("is_all_day = ?");  params.push(is_all_day ? 1 : 0); }
    if (due_end_date !== undefined) { updates.push("due_end_date = ?"); params.push(due_end_date || null); }
    if (completed_at !== undefined) {
      if (completed_at === null) updates.push("completed_at = NULL");
      else { updates.push("completed_at = ?"); params.push(completed_at); }
    }
    if (is_starred !== undefined) { updates.push("is_starred = ?"); params.push(is_starred ? 1 : 0); }

    if (updates.length > 0) {
      params.push(id);
      d.prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`).run(...params);
    }
  }

  static delete(id: string) {
    getDb().prepare("DELETE FROM tasks WHERE id = ?").run(id);
  }

  static getTags(taskId: string) {
    return getDb().prepare(`SELECT t.* FROM tags t JOIN task_tags tt ON t.id = tt.tag_id WHERE tt.task_id = ?`).all(taskId);
  }

  static addTag(taskId: string, tagId: string) {
    try { getDb().prepare(`INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)`).run(taskId, tagId); } catch {}
  }

  static removeTag(taskId: string, tagId: string) {
    getDb().prepare("DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?").run(taskId, tagId);
  }
}
