import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, MoreHorizontal, 
  Calendar, Flag, Tag, CheckCircle2, Circle,
  Clock, Star, Archive, Trash2, Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { TaskItem, TaskStatus, TaskPriority, Tag as TagType } from '../types';
import { cn, formatDuration } from '../lib/utils';
import { t } from '../lib/i18n';
import { api } from '../lib/api';

export default function TaskManager() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [isAdding, setIsAdding] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'Medium' as TaskPriority, due_date: '', tags: [] as string[] });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  // Tag Manager State
  const [tags, setTags] = useState<TagType[]>([]);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6366f1');

  useEffect(() => {
    fetchTasks();
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const data = await api.getTags();
      setTags(data);
    } catch (e) {}
  };

  const fetchTasks = async () => {
    try {
      const data = await api.getTasks();
      setTasks(data);
    } catch (error) {
      toast.error('Gorevler yuklenemedi');
    }
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    const task: Partial<TaskItem> = {
      id: uuidv4(),
      title: newTask.title,
      description: newTask.description,
      priority: newTask.priority,
      status: 'Todo',
      tags: newTask.tags as any, // Passed as array of IDs to server
      due_date: newTask.due_date || undefined,
    };

    try {
      await api.createTask(task);
      setNewTask({ title: '', description: '', priority: 'Medium', due_date: '', tags: [] });
      setIsAdding(false);
      fetchTasks();
      toast.success(t('Task_Saved'));
    } catch (e) {
      toast.error(t('Msg_Error'));
    }
  };

  const editTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editingTask.title.trim()) return;
    try {
      await api.updateTask(editingTask.id, {
        title: editingTask.title,
        description: editingTask.description,
        priority: editingTask.priority,
        due_date: editingTask.due_date,
      });

      // Update tags association
      // Note: For simplicity in this UI, we are replacing the task's tags.
      // But currently the edit modal doesn't have tag selection yet. 
      // I will add it to the modal in the next chunk.
      
      setEditingTask(null);
      fetchTasks();
      toast.success('Görev güncellendi');
    } catch (e) {
      toast.error(t('Msg_Error'));
    }
  };

  const handleTagToggle = async (taskId: string, tagId: string, currentTags: TagType[]) => {
    const isAssigned = currentTags.some(t => t.id === tagId);
    try {
      if (isAssigned) {
        await api.removeTaskTag(taskId, tagId);
      } else {
        await api.addTaskTag(taskId, tagId);
      }
      
      // Update local state for the task being edited if applicable
      if (editingTask && editingTask.id === taskId) {
        const tag = tags.find(t => t.id === tagId);
        if (tag) {
          const newTags = isAssigned 
            ? editingTask.tags.filter(t => t.id !== tagId)
            : [...editingTask.tags, tag];
          setEditingTask({ ...editingTask, tags: newTags });
        }
      }

      fetchTasks();
    } catch (e) {
      toast.error('Gorev etiketi guncellenemedi');
    }
  };

  const createTag = async () => {
    if (!newTagName.trim()) return;
    try {
      await api.createTag({ id: uuidv4(), name: newTagName, color: newTagColor });
      setNewTagName('');
      fetchTags();
      toast.success('Etiket oluşturuldu');
    } catch (e) {
      toast.error('Etiket oluşturulamadı');
    }
  };

  const deleteTag = async (id: string) => {
    try {
      await api.deleteTag(id);
      fetchTags();
      fetchTasks();
      toast.success('Etiket silindi');
    } catch (e) {}
  };

  const toggleStatus = async (task: TaskItem) => {
    const newStatus: TaskStatus = task.status === 'Done' ? 'Todo' : 'Done';
    try {
      await api.updateTask(task.id, { 
        status: newStatus,
        completed_at: newStatus === 'Done' ? new Date().toISOString() : null
      });
      fetchTasks();
    } catch (e) {
      toast.error(t('Msg_Error'));
    }
  };

  const toggleStar = async (task: TaskItem) => {
    try {
      await api.updateTask(task.id, { is_starred: !task.is_starred });
      fetchTasks();
    } catch (e) {
      toast.error(t('Msg_Error'));
    }
  };

  const archiveTask = async (task: TaskItem) => {
    try {
      await api.updateTask(task.id, { status: 'Archived' as any });
      fetchTasks();
      toast.success('Görev arşivlendi');
    } catch (e) {
      toast.error(t('Msg_Error'));
    }
  };

  const priorityWeight = { Critical: 4, High: 3, Medium: 2, Low: 1 };

  const filteredTasks = tasks.filter(t => {
    // If filter is Archived, ONLY show archived. Otherwise, hide archived.
    if (filter === 'Archived') {
      if ((t.status as any) !== 'Archived') return false;
    } else {
      if ((t.status as any) === 'Archived') return false;
    }

    if (filter === 'Todo' && t.status !== 'Todo') return false;
    if (filter === 'Done' && t.status !== 'Done') return false;
    if (filter === 'Starred' && !t.is_starred) return false;
    
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;

    if (tagFilter && !t.tags.some(tag => tag.id === tagFilter)) return false;

    return true;
  }).sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);

  const removeTask = async (id: string) => {
    if (!window.confirm(t('Msg_DeleteConfirm'))) return;
    try {
      await api.deleteTask(id);
      setTasks(tasks.filter(t => t.id !== id));
      toast.success(t('Task_Deleted'));
    } catch (e) {
      toast.error(t('Msg_Error'));
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-display font-bold">{t('Nav_Tasks')}</h2>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-lg shadow-indigo-500/20 transition-all"
        >
          <Plus size={18} />
          <span>{t('Task_NewTask')}</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center justify-between p-4 glass-panel rounded-2xl border border-white/5 overflow-x-auto gap-4">
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10 shrink-0">
          <button 
            onClick={() => setFilter(filter === 'Starred' ? 'All' : 'Starred')}
            className={cn(
              "p-2.5 rounded-lg transition-all flex items-center gap-2 border",
              filter === 'Starred' 
                ? "bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-500/20" 
                : "border-transparent text-neutral-400 hover:text-amber-400 hover:bg-amber-400/5"
            )}
            title="Yıldızlı Görevler"
          >
            <Star size={18} fill={filter === 'Starred' ? "currentColor" : "none"} />
            <span className="text-sm font-bold hidden sm:block">Yıldızlılar</span>
          </button>
          <button 
            onClick={() => setFilter(filter === 'Archived' ? 'All' : 'Archived')}
            className={cn(
              "p-2.5 rounded-lg transition-all flex items-center gap-2 border",
              filter === 'Archived' 
                ? "bg-neutral-700 text-white border-white/20 shadow-lg" 
                : "border-transparent text-neutral-400 hover:text-white hover:bg-white/5"
            )}
            title="Arşivlenmiş Görevler"
          >
            <Archive size={18} />
            <span className="text-sm font-bold hidden sm:block">Arşiv</span>
          </button>
        </div>

        <select 
          value={filter === 'Starred' || filter === 'Archived' ? 'All' : filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
        >
          <option value="All" className="bg-neutral-900 text-white">Tümü</option>
          <option value="Todo" className="bg-neutral-900 text-white">Yapılacaklar</option>
          <option value="Done" className="bg-neutral-900 text-white">Tamamlananlar</option>
        </select>

        <select 
          value={tagFilter || ''}
          onChange={(e) => setTagFilter(e.target.value || null)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
        >
          <option value="" className="bg-neutral-900 text-white">Tüm Etiketler</option>
          {tags.map(tag => (
            <option key={tag.id} value={tag.id} className="bg-neutral-900 text-white">{tag.name}</option>
          ))}
        </select>

        <button 
          onClick={() => setIsTagManagerOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white rounded-xl border border-white/10 transition-all"
        >
          <Tag size={18} />
          <span>Etiketleri Yönet</span>
        </button>
        <div className="flex items-center gap-4 flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('Btn_Search') + "..."}
              className="bg-white/5 border border-white/10 rounded-lg py-1.5 pl-9 pr-4 text-sm focus:outline-none focus:border-indigo-500/50"
            />
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-neutral-500 glass-panel rounded-3xl border border-white/5">
            <CheckCircle2 size={48} className="mb-4 opacity-20" />
            <p>{t('Task_Empty')}</p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredTasks.map((task) => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={cn(
                "group flex items-center gap-4 p-4 rounded-2xl glass-panel border border-white/5 hover:border-white/10 transition-all",
                task.status === 'Done' && "opacity-60"
              )}
            >
              <button 
                onClick={() => toggleStatus(task)}
                className="text-neutral-500 hover:text-indigo-400 transition-colors"
              >
                {task.status === 'Done' ? <CheckCircle2 className="text-indigo-500" size={24} /> : <Circle size={24} />}
              </button>
              
              <div className="flex-1">
                <h4 className={cn("font-medium transition-all", task.status === 'Done' && "line-through")}>
                  {task.title}
                </h4>
                {task.description && (
                  <p className={cn("text-sm mt-1 mb-2 text-neutral-400 line-clamp-2", task.status === 'Done' && "opacity-50")}>
                    {task.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-1">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                    <Flag size={12} className={cn(
                      task.priority === 'Critical' ? 'text-rose-500' : 
                      task.priority === 'High' ? 'text-amber-500' : 'text-indigo-500'
                    )} />
                    <span>{task.priority}</span>
                  </div>
                  {task.due_date && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-400">
                      <Calendar size={12} />
                      <span>{new Date(task.due_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex items-center gap-2">
                      {task.tags.map(tag => (
                        <span 
                          key={tag.id} 
                          className="px-2 py-0.5 rounded-md text-[10px] font-black text-white shadow-sm uppercase tracking-tighter"
                          style={{ backgroundColor: tag.color }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setEditingTask(task)} className="p-2 rounded-lg hover:bg-white/5 text-neutral-500 hover:text-indigo-400">
                  <Edit2 size={18} />
                </button>
                <button onClick={() => toggleStar(task)} className="p-2 rounded-lg hover:bg-white/5 text-neutral-500 hover:text-amber-400">
                  <Star size={18} fill={task.is_starred ? "currentColor" : "none"} />
                </button>
                <button onClick={() => archiveTask(task)} className="p-2 rounded-lg hover:bg-white/5 text-neutral-500 hover:text-white">
                  <Archive size={18} />
                </button>
                <button onClick={() => removeTask(task.id)} className="p-2 rounded-lg hover:bg-white/5 text-neutral-500 hover:text-rose-500">
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          ))}
          </AnimatePresence>
        )}
      </div>

      {/* Add Task Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl"
            >
              <h3 className="text-2xl font-display font-bold mb-6">{t('Task_NewTask')}</h3>
              <form onSubmit={addTask} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">{t('Task_Title')}</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder="Ne yapılması gerekiyor?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">{t('Task_Description')}</label>
                  <textarea 
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors h-24 resize-none"
                    placeholder="Daha fazla detay ekle..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-2">{t('Task_Priority')}</label>
                    <select 
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as TaskPriority })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="Low" className="bg-neutral-900 text-white">{t('Task_Priority_Low')}</option>
                      <option value="Medium" className="bg-neutral-900 text-white">{t('Task_Priority_Medium')}</option>
                      <option value="High" className="bg-neutral-900 text-white">{t('Task_Priority_High')}</option>
                      <option value="Critical" className="bg-neutral-900 text-white">{t('Task_Priority_Critical')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-2">{t('Task_DueDate')}</label>
                    <input 
                      type="date" 
                      value={newTask.due_date}
                      onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors text-white"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-bold text-neutral-400">Etiketler</label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          const isSelected = newTask.tags.includes(tag.id);
                          setNewTask({
                            ...newTask,
                            tags: isSelected ? newTask.tags.filter(id => id !== tag.id) : [...newTask.tags, tag.id]
                          });
                        }}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold transition-all border",
                          newTask.tags.includes(tag.id)
                            ? "border-transparent text-white shadow-lg"
                            : "bg-white/5 border-white/10 text-neutral-500"
                        )}
                        style={{ backgroundColor: newTask.tags.includes(tag.id) ? tag.color : undefined }}
                      >
                        {tag.name}
                      </button>
                    ))}
                    {tags.length === 0 && <p className="text-xs text-neutral-600 italic">Henüz etiket oluşturulmadı.</p>}
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors"
                  >
                    {t('Btn_Cancel')}
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-colors font-bold"
                  >
                    {t('Btn_Add')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Task Modal */}
      <AnimatePresence>
        {editingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl"
            >
              <h3 className="text-2xl font-display font-bold mb-6">Görevi Düzenle</h3>
              <form onSubmit={editTaskSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">{t('Task_Title')}</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={editingTask.title}
                    onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder="Görev adı..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">{t('Task_Description')}</label>
                  <textarea 
                    value={editingTask.description || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors h-24 resize-none"
                    placeholder="Görev açıklaması..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-2">{t('Task_Priority')}</label>
                    <select 
                      value={editingTask.priority}
                      onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as TaskPriority })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="Low" className="bg-neutral-900 text-white">{t('Task_Priority_Low')}</option>
                      <option value="Medium" className="bg-neutral-900 text-white">{t('Task_Priority_Medium')}</option>
                      <option value="High" className="bg-neutral-900 text-white">{t('Task_Priority_High')}</option>
                      <option value="Critical" className="bg-neutral-900 text-white">{t('Task_Priority_Critical')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-2">{t('Task_DueDate')}</label>
                    <input 
                      type="date"
                      value={editingTask.due_date ? new Date(editingTask.due_date).toISOString().split('T')[0] : ''}
                      onChange={(e) => setEditingTask({ ...editingTask, due_date: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-bold text-neutral-400">Etiketler</label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleTagToggle(editingTask.id, tag.id, editingTask.tags)}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold transition-all border",
                          editingTask.tags.some(t => t.id === tag.id)
                            ? "border-transparent text-white shadow-lg"
                            : "bg-white/5 border-white/10 text-neutral-500"
                        )}
                        style={{ backgroundColor: editingTask.tags.some(t => t.id === tag.id) ? tag.color : undefined }}
                      >
                        {tag.name}
                      </button>
                    ))}
                    {tags.length === 0 && <p className="text-xs text-neutral-600 italic">Henüz etiket oluşturulmadı.</p>}
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setEditingTask(null)}
                    className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors"
                  >
                    {t('Btn_Cancel')}
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-colors font-bold"
                  >
                    Kaydet
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tag Manager Modal */}
      <AnimatePresence>
        {isTagManagerOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md glass-panel p-8 rounded-[2rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-display font-bold text-white">Etiketleri Yönet</h3>
                  <p className="text-sm text-neutral-500">Görevlerinizi kategorize edin</p>
                </div>
                <button onClick={() => setIsTagManagerOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-neutral-500 hover:text-white transition-all"><Circle size={20} /></button>
              </div>

              <div className="space-y-6">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input 
                      type="text" 
                      placeholder="Yeni etiket adı..." 
                      value={newTagName}
                      onChange={e => setNewTagName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-all"
                    />
                    <input 
                      type="color" 
                      value={newTagColor}
                      onChange={e => setNewTagColor(e.target.value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 border-0 bg-transparent cursor-pointer rounded-lg"
                    />
                  </div>
                  <button 
                    onClick={createTag}
                    className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all font-bold"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {tags.map(tag => (
                    <div key={tag.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 group hover:border-white/10 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-md shadow-sm" style={{ backgroundColor: tag.color }} />
                        <span className="font-bold text-neutral-200">{tag.name}</span>
                      </div>
                      <button 
                        onClick={() => deleteTag(tag.id)}
                        className="p-2 text-neutral-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {tags.length === 0 && (
                    <div className="text-center py-8">
                      <Tag className="mx-auto text-neutral-700 mb-2" size={32} />
                      <p className="text-neutral-500 text-sm italic">Henüz etiket bulunmuyor</p>
                    </div>
                  )}
                </div>
              </div>

              <button 
                onClick={() => setIsTagManagerOpen(false)}
                className="w-full mt-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all font-bold border border-white/5"
              >
                Kapat
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
