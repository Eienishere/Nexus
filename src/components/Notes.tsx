import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, StickyNote, Pin, 
  Trash2, Save, X, 
  Bold, Italic, Strikethrough, Underline,
  Heading1, Heading2, Heading3,
  List, ListOrdered, CheckSquare,
  Quote, Code, Link as LinkIcon, Image as ImageIcon,
  Table as TableIcon, FileCode2,
  Columns, BookOpen, PenLine, Minus,
  Star, Archive, Tag as TagIcon
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { motion } from 'motion/react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { t } from '../lib/i18n';
import { api } from '../lib/api';
import { Note, Tag } from '../types';

import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css';

type ViewMode = 'edit' | 'split' | 'read';
type NoteFilter = 'all' | 'starred' | 'archived' | 'tags';

const normalizeNote = (note: Partial<Note>): Note => ({
  id: note.id ?? uuidv4(),
  title: note.title ?? '',
  content: note.content ?? '',
  color: note.color ?? 'bg-white/5',
  is_pinned: note.is_pinned ?? false,
  is_starred: note.is_starred ?? false,
  is_archived: note.is_archived ?? false,
  updated_at: note.updated_at ?? new Date().toISOString(),
  tags: Array.isArray(note.tags) ? note.tags : [],
});

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('read');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<NoteFilter>('all');
  const [customListChar, setCustomListChar] = useState<string>('');
  const [showCustomListInput, setShowCustomListInput] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastSavedContent, setLastSavedContent] = useState<string>('');
  
  // Tag Manager State
  const [tags, setTags] = useState<Tag[]>([]);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6366f1');
  const [showNoteTagSelector, setShowNoteTagSelector] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchNotes = async () => {
    try {
      const data = await api.getNotes();
      setNotes(data.map(normalizeNote));
    } catch (e) {
      toast.error('Notlar yüklenemedi.');
    }
  };

  const fetchTags = async () => {
    try {
      const data = await api.getTags();
      setTags(data);
    } catch (e) {}
  };

  useEffect(() => {
    fetchNotes();
    fetchTags();
  }, []);

  // Otomatik kaydetme - 10 karakter değişiklik sonra
  useEffect(() => {
    if (!activeNote) return;
    
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    
    const currentContent = activeNote.content + activeNote.title;
    const charDiff = Math.abs(currentContent.length - lastSavedContent.length);
    
    const timer = setTimeout(() => {
      // Eğer 10+ karakter değişiklik varsa kaydet
      const newContent = activeNote.content + activeNote.title;
      if (Math.abs(newContent.length - lastSavedContent.length) >= 10) {
        saveNoteWithTracking();
      }
    }, 1500);
    
    setAutoSaveTimer(timer);
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [activeNote?.content, activeNote?.title]);

  // activeNote değiştiğinde textarea'yı focus et (edit mode'da)
  useEffect(() => {
    if (viewMode === 'edit' && activeNote) {
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [activeNote?.id, viewMode]);

  const createNote = async () => {
    const newNote: Note = {
      id: uuidv4(),
      title: t('Note_NewNote'),
      content: '',
      color: 'bg-white/5',
      is_pinned: false,
      is_starred: false,
      is_archived: false,
      updated_at: new Date().toISOString(),
      tags: [],
    };
    
    try {
      await api.createNote(newNote);
      setNotes([newNote, ...notes]);
      setActiveNote(newNote);
      setViewMode('edit');
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    } catch (e) {
      toast.error(t('Msg_Error'));
    }
  };

  const saveNoteWithTracking = async () => {
    if (activeNote) {
      await saveNote();
      setLastSavedContent(activeNote.content + activeNote.title);
    }
  };

  const saveNote = async () => {
    if (activeNote) {
      const updatedNote = { ...activeNote };
      try {
        await api.updateNote(updatedNote.id, updatedNote);
        setNotes(notes.map(n => n.id === updatedNote.id ? updatedNote : n));
        setActiveNote(updatedNote);
        toast.success(t('Note_Saved'));
      } catch (e) {
        toast.error(t('Msg_Error'));
      }
    }
  };

  const deleteNote = async (id: string) => {
    if (!window.confirm(t('Msg_DeleteConfirm'))) return;
    try {
      await api.deleteNote(id);
      setNotes(notes.filter(n => n.id !== id));
      if (activeNote?.id === id) setActiveNote(null);
      toast.success(t('Note_Deleted'));
    } catch (e) {
      toast.error(t('Msg_Error'));
    }
  };

  const togglePin = async (note: Note) => {
    const updatedNote = { ...note, is_pinned: !note.is_pinned };
    try {
      await api.updateNote(note.id, updatedNote);
      setNotes(notes.map(n => n.id === note.id ? updatedNote : n));
      setActiveNote(updatedNote);
    } catch (e) {
      toast.error(t('Msg_Error'));
    }
  };

  const toggleStar = async (note: Note) => {
    const updatedNote = { ...note, is_starred: !note.is_starred };
    try {
      await api.updateNote(note.id, updatedNote);
      setNotes(notes.map(n => n.id === note.id ? updatedNote : n));
      setActiveNote(updatedNote);
      toast.success(updatedNote.is_starred ? 'Yıldızlandı' : 'Yıldız kaldırıldı');
    } catch (e) {
      toast.error(t('Msg_Error'));
    }
  };

  const toggleArchive = async (note: Note) => {
    const updatedNote = { ...note, is_archived: !note.is_archived };
    try {
      await api.updateNote(note.id, updatedNote);
      setNotes(notes.map(n => n.id === note.id ? updatedNote : n));
      if (activeNote?.id === note.id) setActiveNote(null);
      toast.success(updatedNote.is_archived ? 'Arşivlendi' : 'Arşivden çıkarıldı');
    } catch (e) {
      toast.error(t('Msg_Error'));
    }
  };

  const handleNoteTagToggle = async (noteId: string, tagId: string, currentTags: Tag[]) => {
    const isAssigned = currentTags.some(t => t.id === tagId);
    try {
      if (isAssigned) {
        await api.removeNoteTag(noteId, tagId);
      } else {
        await api.addNoteTag(noteId, tagId);
      }
      
      if (activeNote && activeNote.id === noteId) {
        const tag = tags.find(t => t.id === tagId);
        if (tag) {
          const activeTags = activeNote.tags ?? [];
          const newTags = isAssigned 
            ? activeTags.filter(t => t.id !== tagId)
            : [...activeTags, tag];
          setActiveNote({ ...activeNote, tags: newTags });
        }
      }

      fetchNotes();
    } catch (e) {
      toast.error('Not etiketi güncellenemedi');
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
      fetchNotes();
      toast.success('Etiket silindi');
    } catch (e) {}
  };

  const filteredNotes = notes
    .filter(n => {
      // Search filter
      const noteTags = n.tags ?? [];
      const noteTitle = n.title ?? '';
      const noteContent = n.content ?? '';
      const matchesSearch = noteTitle.toLowerCase().includes(search.toLowerCase()) || 
        noteContent.toLowerCase().includes(search.toLowerCase());
      
      // Status filter
      if (filter === 'starred') return matchesSearch && n.is_starred && !n.is_archived;
      if (filter === 'archived') return matchesSearch && n.is_archived;
      if (filter === 'tags') {
        // "Etiketler" sekmesinde - etiket seçilmişse o etikete sahip notları göster
        if (selectedTag) {
          return matchesSearch && noteTags.some(t => t.id === selectedTag) && !n.is_archived;
        }
        // Hiçbir etiket seçilmemişse hiçbir not gösterme
        return false;
      }
      return matchesSearch && !n.is_archived; // 'all' shows active notes only
    })
    .sort((a, b) => {
      // Sort by starred first, then by pinned, then by date
      if (a.is_starred !== b.is_starred) return a.is_starred ? -1 : 1;
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  const insertMd = (prefix: string, suffix: string, isLineBlock = false) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    let newContent = '';
    let newSelectionStart = 0;
    let newSelectionEnd = 0;

    if (isLineBlock) {
      const before = text.substring(0, start);
      const after = text.substring(end);
      const isNewLineStart = before.length === 0 || before.endsWith('\n');
      const isNewLineEnd = after.length === 0 || after.startsWith('\n');
      
      const p = isNewLineStart ? prefix : '\n' + prefix;
      const s = isNewLineEnd ? suffix : suffix + '\n';
      
      newContent = before + p + text.substring(start, end) + s + after;
      newSelectionStart = start + p.length;
      newSelectionEnd = end + p.length;
    } else {
      newContent = text.substring(0, start) + prefix + text.substring(start, end) + suffix + text.substring(end);
      newSelectionStart = start + prefix.length;
      newSelectionEnd = end + prefix.length;
    }
    
    setActiveNote(prev => prev ? { ...prev, content: newContent } : null);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newSelectionStart, newSelectionEnd);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Regex karakterlerini escape etme fonksiyonu
    const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    if (e.key === 'Tab') {
      e.preventDefault();
      insertMd('  ', '');
    } else if (e.key === 'Enter') {
      // Listelerde Enter ile yeni madde açma
      if (activeNote && textareaRef.current) {
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const text = textarea.value;
        
        // Satırın başını bul
        let lineStart = text.lastIndexOf('\n', start - 1) + 1;
        const currentLine = text.substring(lineStart, start);
        
        // Satırın başındaki formatlama kontrol et
        const checkboxMatch = currentLine.match(/^(\s*)(- \[([^\]]*?)\])\s/);
        const numberedListMatch = currentLine.match(/^(\s*)(\d+)\.\s/);
        const listMatch = currentLine.match(/^(\s*)(-)\s/);
        const customListMatch = customListChar ? currentLine.match(new RegExp(`^(\\s*)${escapeRegExp(customListChar)}\\s`)) : null;
        
        if (checkboxMatch) {
          // Checkbox listesi
          e.preventDefault();
          const indent = checkboxMatch[1];
          const newContent = text.substring(0, start) + '\n' + indent + '- [ ] ' + text.substring(start);
          setActiveNote(prev => prev ? { ...prev, content: newContent } : null);
          
          setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + 1 + indent.length + 6;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
          }, 0);
        } else if (numberedListMatch) {
          // Numaralı liste
          e.preventDefault();
          const indent = numberedListMatch[1];
          const currentNumber = parseInt(numberedListMatch[2]);
          const nextNumber = currentNumber + 1;
          const newContent = text.substring(0, start) + '\n' + indent + nextNumber + '. ' + text.substring(start);
          setActiveNote(prev => prev ? { ...prev, content: newContent } : null);
          
          setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + 1 + indent.length + nextNumber.toString().length + 2;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
          }, 0);
        } else if (customListMatch) {
          // Özel karakterli liste
          e.preventDefault();
          const indent = customListMatch[1];
          const newContent = text.substring(0, start) + '\n' + indent + customListChar + ' ' + text.substring(start);
          setActiveNote(prev => prev ? { ...prev, content: newContent } : null);
          
          setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + 1 + indent.length + customListChar.length + 1;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
          }, 0);
        } else if (listMatch) {
          // Madde işaretli liste
          e.preventDefault();
          const indent = listMatch[1];
          const newContent = text.substring(0, start) + '\n' + indent + '- ' + text.substring(start);
          setActiveNote(prev => prev ? { ...prev, content: newContent } : null);
          
          setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + 1 + indent.length + 2;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
          }, 0);
        }
      }
    } else if (e.ctrlKey || e.metaKey) {
      if (e.key === 's') {
        e.preventDefault();
        saveNote();
      } else if (e.key === 'b') {
        e.preventDefault();
        insertMd('**', '**');
      } else if (e.key === 'i') {
        e.preventDefault();
        insertMd('*', '*');
      }
    }
  };

  const ToolbarBtn = ({ icon: Icon, onClick, title }: any) => (
    <button 
      onClick={onClick} 
      title={title}
      className="p-1.5 hover:bg-white/10 rounded border border-transparent hover:border-white/10 text-neutral-400 hover:text-white transition-all flex items-center justify-center bg-white/5"
    >
      <Icon size={16} />
    </button>
  );

  return (
    <div className="h-full flex flex-col xl:flex-row gap-4 lg:gap-6">
      {/* Sidebar */}
      <div className="w-full xl:w-72 flex flex-col space-y-4 shrink-0 glass-panel rounded-3xl p-4 border border-white/5 max-h-[38vh] xl:max-h-none">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-2xl font-display font-bold">Notlar</h2>
          <button 
            onClick={createNote}
            className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-lg shadow-indigo-500/20 transition-all"
            title="Yeni Not"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
          <input 
            type="text" 
            placeholder={t('Note_Search')} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/40 border border-white/5 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all",
              filter === 'all'
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "bg-white/5 text-neutral-400 hover:bg-white/10 border border-white/5"
            )}
          >
            Tümü
          </button>
          <button
            onClick={() => setFilter('starred')}
            className={cn(
              "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1",
              filter === 'starred'
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "bg-white/5 text-neutral-400 hover:bg-white/10 border border-white/5"
            )}
            title="Yıldızlı notlar"
          >
            <Star size={14} />
          </button>
          <button
            onClick={() => setFilter('archived')}
            className={cn(
              "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1",
              filter === 'archived'
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "bg-white/5 text-neutral-400 hover:bg-white/10 border border-white/5"
            )}
            title="Arşivlenmiş notlar"
          >
            <Archive size={14} />
          </button>
          <button
            onClick={() => { setFilter('tags'); if (tags.length > 0 && !selectedTag) setSelectedTag(tags[0].id); }}
            className={cn(
              "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1",
              filter === 'tags'
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "bg-white/5 text-neutral-400 hover:bg-white/10 border border-white/5"
            )}
            title="Etiketler"
          >
            <TagIcon size={14} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {filter === 'tags' ? (
            // Etiketler sekmesi
            tags.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-neutral-500">
                <TagIcon size={24} className="mb-2 opacity-20" />
                <p className="text-sm">Etiket bulunamadı</p>
              </div>
            ) : (
              tags.map(tag => {
                const notesWithTag = notes.filter(n => (n.tags ?? []).some(t => t.id === tag.id) && !n.is_archived);
                return (
                  <div key={tag.id} className="space-y-2">
                    <button
                      onClick={() => setSelectedTag(tag.id)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg border transition-all",
                        selectedTag === tag.id
                          ? "border-white/20 bg-white/10"
                          : "border-white/5 hover:bg-white/5"
                      )}
                      style={{ borderLeftColor: tag.color + '80', borderLeftWidth: '3px' }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm" style={{ color: tag.color }}>
                          {tag.name}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {notesWithTag.length}
                        </span>
                      </div>
                    </button>
                    {selectedTag === tag.id && (
                      <div className="pl-2 space-y-1">
                        {notesWithTag.length === 0 ? (
                          <p className="text-xs text-neutral-500">Bu etikete sahip not yok</p>
                        ) : (
                          notesWithTag.map(note => (
                            <motion.div
                              key={note.id}
                              onClick={() => { setActiveNote(note); }}
                              className={cn(
                                "p-2 rounded-lg border text-xs transition-all cursor-pointer",
                                activeNote?.id === note.id
                                  ? "border-indigo-500 bg-indigo-500/10"
                                  : "border-white/5 bg-black/20 hover:border-white/10"
                              )}
                            >
                              <p className="font-semibold truncate text-white">{note.title}</p>
                              <p className="text-neutral-500 truncate">{note.content.slice(0, 40)}</p>
                            </motion.div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )
          ) : (
            // Notlar listesi
            filteredNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-neutral-500">
                <StickyNote size={24} className="mb-2 opacity-20" />
                <p className="text-sm">Not bulunamadı</p>
              </div>
            ) : (
            filteredNotes.map((note) => (
              <motion.div
                key={note.id}
                onClick={() => { setActiveNote(note); if(viewMode === 'edit') setViewMode('read'); }}
                className={cn(
                  "p-3 rounded-xl border transition-all cursor-pointer group relative hover:-translate-y-0.5",
                  activeNote?.id === note.id ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10" : "border-white/5 bg-black/20 hover:border-white/10"
                )}
              >
                <div className="absolute top-3 right-3 flex gap-1">
                  {note.is_starred && <Star size={12} className="text-indigo-400 fill-indigo-400" />}
                  {note.is_pinned && <Pin size={12} className="text-indigo-400 fill-indigo-400" />}
                </div>
                <h4 className="font-bold text-sm mb-1 pr-6 truncate text-white">{note.title}</h4>
                <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">{
                  (note.content ?? '').replace(/[#*`~>-]/g, '').slice(0, 80)
                }</p>
                {(note.tags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(note.tags ?? []).slice(0, 2).map(tag => (
                      <span
                        key={tag.id}
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: tag.color + '2d',
                          color: tag.color
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                    {(note.tags ?? []).length > 2 && <span className="text-[10px] text-neutral-500">+{(note.tags ?? []).length - 2}</span>}
                  </div>
                )}
                <p className="text-[10px] text-neutral-600 mt-2 font-mono">{new Date(note.updated_at).toLocaleDateString()}</p>
              </motion.div>
            ))
            )
          )}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 min-w-0 glass-panel rounded-3xl border border-white/5 flex flex-col overflow-hidden bg-black/10">
        {activeNote ? (
          <>
            {/* Header */}
            <div className="p-3 sm:p-4 border-b border-white/5 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-0 lg:justify-between bg-white/5 shadow-sm">
              <div className="text-xl font-bold font-display text-white flex items-center flex-1 min-w-0">
                <input
                  type="text"
                  value={activeNote.title}
                  onChange={(e) => setActiveNote({ ...activeNote, title: e.target.value })}
                  className="flex-1 bg-transparent border-none focus:outline-none text-white font-display placeholder:text-neutral-500"
                  placeholder="Başlık yazın..."
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap pl-0 lg:pl-4 border-l-0 lg:border-l border-white/10 ml-0 lg:ml-4">
                <div className="flex bg-black/40 rounded-lg p-1 mr-2 border border-white/5">
                  <button 
                    onClick={() => setViewMode('edit')}
                    className={cn("p-1.5 rounded-md transition-colors", viewMode === 'edit' ? "bg-white/10 text-white" : "text-neutral-500 hover:text-white")}
                    title="Düzenleme Modu"
                  ><PenLine size={16} /></button>
                  <button 
                    onClick={() => setViewMode('split')}
                    className={cn("p-1.5 rounded-md transition-colors", viewMode === 'split' ? "bg-white/10 text-white" : "text-neutral-500 hover:text-white")}
                    title="Bölünmüş Görünüm"
                  ><Columns size={16} /></button>
                  <button 
                    onClick={() => setViewMode('read')}
                    className={cn("p-1.5 rounded-md transition-colors", viewMode === 'read' ? "bg-white/10 text-white" : "text-neutral-500 hover:text-white")}
                    title="Okuma Modu"
                  ><BookOpen size={16} /></button>
                </div>

                <button onClick={saveNote} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 rounded-lg text-sm font-medium transition-all">
                  <Save size={16} /> <span className="hidden sm:inline">Kaydet</span>
                </button>
                
                <button onClick={() => togglePin(activeNote)} className={cn("p-2 rounded-lg transition-colors border", activeNote.is_pinned ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" : "hover:bg-white/10 text-neutral-400 border-transparent")}>
                  <Pin size={16} fill={activeNote.is_pinned ? "currentColor" : "none"} />
                </button>

                <button onClick={() => toggleStar(activeNote)} className={cn("p-2 rounded-lg transition-colors border", activeNote.is_starred ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" : "hover:bg-white/10 text-neutral-400 border-transparent")}>
                  <Star size={16} fill={activeNote.is_starred ? "currentColor" : "none"} />
                </button>

                <button onClick={() => toggleArchive(activeNote)} className={cn("p-2 rounded-lg transition-colors border", activeNote.is_archived ? "bg-yellow-500/20 text-yellow-600 border-yellow-500/30" : "hover:bg-white/10 text-neutral-400 border-transparent")}>
                  <Archive size={16} />
                </button>

                <button onClick={() => setShowNoteTagSelector(!showNoteTagSelector)} className="p-2 hover:bg-white/10 text-neutral-400 hover:text-white rounded-lg transition-colors border border-transparent hover:border-white/10">
                  <TagIcon size={16} />
                </button>
                
                <button onClick={() => deleteNote(activeNote.id)} className="p-2 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 rounded-lg transition-colors border border-transparent hover:border-red-500/30">
                  <Trash2 size={16} />
                </button>

                <button onClick={() => setActiveNote(null)} className="p-2 hover:bg-white/10 text-neutral-400 rounded-lg transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Editor & Preview Area */}
            <div className="flex-1 overflow-hidden flex flex-col xl:flex-row">
              {(viewMode === 'edit' || viewMode === 'split') && (
                <div className={cn("flex-1 flex flex-col h-full overflow-hidden", viewMode === 'split' && "xl:border-r border-white/5")}>
                  {showNoteTagSelector && (
                    <div className="px-2 py-2 border-b border-white/10 bg-black/30 space-y-2 max-h-48 overflow-y-auto">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-neutral-400">Etiketler ({(activeNote.tags ?? []).length}/{tags.length})</label>
                        <button
                          onClick={() => setIsTagManagerOpen(true)}
                          className="text-xs px-2 py-1 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 rounded border border-indigo-500/30 transition-all"
                        >
                          Yönet
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {tags.length === 0 ? (
                          <p className="text-xs text-neutral-500">Etiket oluşturmak için "Yönet"'e tıklayın</p>
                        ) : (
                          tags.map(tag => (
                            <button
                              key={tag.id}
                              onClick={() => handleNoteTagToggle(activeNote.id, tag.id, activeNote.tags ?? [])}
                              className={cn(
                                "px-2 py-1 rounded text-xs font-medium transition-all border",
                                (activeNote.tags ?? []).some(t => t.id === tag.id)
                                  ? "bg-opacity-40 border-opacity-60"
                                  : "bg-opacity-10 border-opacity-20 opacity-60 hover:opacity-100"
                              )}
                              style={{
                                backgroundColor: tag.color + ((activeNote.tags ?? []).some(t => t.id === tag.id) ? '66' : '1a'),
                                borderColor: tag.color + '4d',
                                color: tag.color
                              }}
                            >
                              {tag.name}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                  {isTagManagerOpen && (
                    <div className="px-2 py-3 border-b border-white/10 bg-black/40 space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-neutral-400">Yeni Etiket</label>
                        <button
                          onClick={() => setIsTagManagerOpen(false)}
                          className="text-xs text-neutral-500 hover:text-white"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          placeholder="Etiket adı..."
                          className="flex-1 px-2 py-1 bg-black/40 border border-white/10 rounded text-xs focus:outline-none focus:border-indigo-500/50 text-white"
                        />
                        <input
                          type="color"
                          value={newTagColor}
                          onChange={(e) => setNewTagColor(e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer"
                        />
                        <button
                          onClick={createTag}
                          className="px-2 py-1 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 rounded text-xs transition-all"
                        >
                          Ekle
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1 border-t border-white/10 pt-2">
                        {tags.map(tag => (
                          <div
                            key={tag.id}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                            style={{ backgroundColor: tag.color + '1a', borderLeft: `3px solid ${tag.color}` }}
                          >
                            <span style={{ color: tag.color }}>{tag.name}</span>
                            <button
                              onClick={() => deleteTag(tag.id)}
                              className="text-neutral-500 hover:text-red-400 text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5 p-2 border-b border-white/10 bg-black/20 shrink-0">
                    <ToolbarBtn icon={Bold} title="Kalın" onClick={() => insertMd('**', '**')} />
                    <ToolbarBtn icon={Italic} title="İtalik" onClick={() => insertMd('*', '*')} />
                    <ToolbarBtn icon={Strikethrough} title="Üstü Çizili" onClick={() => insertMd('~~', '~~')} />
                    <ToolbarBtn icon={Underline} title="Altı Çizili" onClick={() => insertMd('<u>', '</u>')} />
                    <div className="w-px h-5 bg-white/10 mx-1" />
                    <ToolbarBtn icon={Heading1} title="Başlık 1" onClick={() => insertMd('# ', '', true)} />
                    <ToolbarBtn icon={Heading2} title="Başlık 2" onClick={() => insertMd('## ', '', true)} />
                    <ToolbarBtn icon={Heading3} title="Başlık 3" onClick={() => insertMd('### ', '', true)} />
                    <div className="w-px h-5 bg-white/10 mx-1" />
                    <ToolbarBtn icon={List} title="Madde İşaretli Liste" onClick={() => insertMd('- ', '', true)} />
                    <ToolbarBtn icon={ListOrdered} title="Numaralı Liste" onClick={() => insertMd('1. ', '', true)} />
                    <ToolbarBtn icon={CheckSquare} title="Görev Listesi" onClick={() => insertMd('- [ ] ', '', true)} />
                    <button 
                      onClick={() => setShowCustomListInput(!showCustomListInput)}
                      className="p-1.5 hover:bg-white/10 rounded border border-transparent hover:border-white/10 text-neutral-400 hover:text-white transition-all flex items-center justify-center bg-white/5"
                      title="Özel Karakterli Liste"
                    >
                      ◆
                    </button>
                    <div className="w-px h-5 bg-white/10 mx-1" />
                    <ToolbarBtn icon={Quote} title="Alıntı" onClick={() => insertMd('> ', '', true)} />
                    <ToolbarBtn icon={Minus} title="Ayırıcı Çizgi" onClick={() => insertMd('---', '', true)} />
                    <ToolbarBtn icon={Code} title="Satıriçi Kod" onClick={() => insertMd('`', '`')} />
                    <ToolbarBtn icon={FileCode2} title="Kod Bloğu" onClick={() => insertMd('```\n', '\n```', true)} />
                    <div className="w-px h-5 bg-white/10 mx-1" />
                    <ToolbarBtn icon={LinkIcon} title="Bağlantı" onClick={() => insertMd('[', '](url)')} />
                    <ToolbarBtn icon={ImageIcon} title="Resim" onClick={() => insertMd('![', '](image-url)')} />
                    <ToolbarBtn icon={TableIcon} title="Tablo" onClick={() => insertMd('| Başlık 1 | Başlık 2 |\n|----------|----------|\n| Sütun 1  | Sütun 2  |', '', true)} />
                  </div>
                  {showCustomListInput && (
                    <div className="px-2 py-2 border-b border-white/10 bg-black/30 flex items-center gap-2">
                      <label className="text-xs text-neutral-400 whitespace-nowrap">Özel Karakter:</label>
                      <input
                        type="text"
                        maxLength={1}
                        value={customListChar}
                        onChange={(e) => setCustomListChar(e.target.value)}
                        placeholder="Örn: ◆"
                        className="w-12 px-2 py-1 bg-black/40 border border-white/10 rounded text-center text-white focus:outline-none focus:border-indigo-500/50 text-sm"
                      />
                      <button
                        onClick={() => {
                          if (customListChar) {
                            insertMd(customListChar + ' ', '', true);
                            setShowCustomListInput(false);
                          }
                        }}
                        className="ml-auto px-2 py-1 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 rounded text-xs transition-all"
                      >
                        Ekle
                      </button>
                    </div>
                  )}
                  <textarea 
                    ref={textareaRef}
                    value={activeNote.content}
                    onChange={(e) => setActiveNote({ ...activeNote, content: e.target.value })}
                    onKeyDown={handleKeyDown}
                    className="flex-1 w-full p-3 sm:p-6 bg-transparent resize-none focus:outline-none font-mono text-sm text-neutral-300 leading-relaxed overflow-y-auto"
                    placeholder="Markdown ile yazmaya başlayın..."
                  />
                </div>
              )}
              
              {(viewMode === 'read' || viewMode === 'split') && (
                <div className="flex-1 p-3 sm:p-6 lg:p-8 overflow-y-auto w-full custom-scrollbar bg-black/10">
                  <div className="prose prose-invert max-w-none prose-pre:bg-neutral-900 prose-pre:border prose-pre:border-white/10 prose-img:rounded-xl prose-a:text-indigo-400 prose-headings:font-display">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeKatex, rehypeHighlight, rehypeRaw]}
                    >
                      {activeNote.content}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 space-y-4">
            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center">
              <BookOpen size={40} className="opacity-20 text-indigo-400" />
            </div>
            <div className="text-center">
              <p className="text-xl font-display font-medium text-white mb-2">Görüntülemek için bir not seçin</p>
              <p className="text-sm">Veya sol menüden <span className="text-white">+</span> butonuna basarak yeni oluşturun.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
