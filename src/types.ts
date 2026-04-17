export type TaskStatus = 'Todo' | 'InProgress' | 'Done' | 'Archived';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  is_pinned: boolean;
  is_starred: boolean;
  is_archived: boolean;
  updated_at: string;
  tags: Tag[];
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string;
  created_at: string;
  completed_at?: string;
  is_starred: boolean;
  project_id?: string;
  tags: Tag[];
  notes?: string;
}

export interface PomodoroSession {
  id: string;
  task_id?: string;
  start_time: string;
  end_time?: string;
  type: 'Work' | 'ShortBreak' | 'LongBreak';
  was_completed: boolean;
}

export interface AppTheme {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
}
