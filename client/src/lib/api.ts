// API Service utility for communicating with the Express backend

const API_BASE = '/api';

export const api = {
  // Tasks
  getTasks: async () => {
    const res = await fetch(`${API_BASE}/tasks`);
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
  },
  
  createTask: async (task: any) => {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    if (!res.ok) throw new Error('Failed to create task');
    return res.json();
  },
  
  updateTask: async (id: string, updates: any) => {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update task');
    return res.json();
  },
  
  deleteTask: async (id: string) => {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete task');
    return res.json();
  },

  // Pomodoro
  savePomodoroSession: async (session: any) => {
    const res = await fetch(`${API_BASE}/pomodoro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    });
    if (!res.ok) throw new Error('Failed to save pomodoro session');
    return res.json();
  },

  // Notes
  getNotes: async () => {
    const res = await fetch(`${API_BASE}/notes`);
    if (!res.ok) throw new Error('Failed to fetch notes');
    return res.json();
  },
  
  createNote: async (note: any) => {
    const res = await fetch(`${API_BASE}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    });
    if (!res.ok) throw new Error('Failed to create note');
    return res.json();
  },
  
  updateNote: async (id: string, note: any) => {
    const res = await fetch(`${API_BASE}/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    });
    if (!res.ok) throw new Error('Failed to update note');
    return res.json();
  },
  
  deleteNote: async (id: string) => {
    const res = await fetch(`${API_BASE}/notes/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete note');
    return res.json();
  },

  // Stats
  getStats: async () => {
    const res = await fetch(`${API_BASE}/stats/summary`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  // Settings
  getSettings: async () => {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  updateSetting: async (key: string, value: string) => {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) throw new Error('Failed to update setting');
    return res.json();
  },

  // Alarms
  getAlarms: async () => {
    const res = await fetch(`${API_BASE}/alarms`);
    if (!res.ok) throw new Error('Failed to fetch alarms');
    return res.json();
  },
  
  createAlarm: async (alarm: any) => {
    const res = await fetch(`${API_BASE}/alarms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alarm)
    });
    if (!res.ok) throw new Error('Failed to create alarm');
    return res.json();
  },

  updateAlarm: async (id: string, updates: any) => {
    const res = await fetch(`${API_BASE}/alarms/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update alarm');
    return res.json();
  },

  deleteAlarm: async (id: string) => {
    const res = await fetch(`${API_BASE}/alarms/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete alarm');
    return res.json();
  },

  // Tags
  getTags: async () => {
    const res = await fetch(`${API_BASE}/tags`);
    if (!res.ok) throw new Error('Failed to fetch tags');
    return res.json();
  },

  createTag: async (tag: any) => {
    const res = await fetch(`${API_BASE}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tag)
    });
    if (!res.ok) throw new Error('Failed to create tag');
    return res.json();
  },

  updateTag: async (id: string, updates: any) => {
    const res = await fetch(`${API_BASE}/tags/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update tag');
    return res.json();
  },

  deleteTag: async (id: string) => {
    const res = await fetch(`${API_BASE}/tags/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete tag');
    return res.json();
  },

  // Task-Tag Associations
  getTaskTags: async (taskId: string) => {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/tags`);
    if (!res.ok) throw new Error('Failed to fetch task tags');
    return res.json();
  },

  addTaskTag: async (taskId: string, tagId: string) => {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag_id: tagId })
    });
    if (!res.ok) throw new Error('Failed to add task tag');
    return res.json();
  },

  removeTaskTag: async (taskId: string, tagId: string) => {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/tags/${tagId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to remove task tag');
    return res.json();
  },

  // Note-Tag Associations
  addNoteTag: async (noteId: string, tagId: string) => {
    const res = await fetch(`${API_BASE}/notes/${noteId}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag_id: tagId })
    });
    if (!res.ok) throw new Error('Failed to add note tag');
    return res.json();
  },

  removeNoteTag: async (noteId: string, tagId: string) => {
    const res = await fetch(`${API_BASE}/notes/${noteId}/tags/${tagId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to remove note tag');
    return res.json();
  }
};
