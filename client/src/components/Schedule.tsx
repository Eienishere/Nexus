import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, Clock, Trash2, Edit2,
  Download, Upload, FileUp, ClipboardPaste, AlertTriangle,
  CheckCircle2, X, CalendarDays, List, LayoutGrid, RotateCcw
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '../lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Pazar

interface ScheduleItem {
  id: string;
  title: string;
  dayOfWeek: DayOfWeek; // 0-6
  startTime: string;    // "HH:mm"
  endTime: string;      // "HH:mm"
  color: string;
  isAllDay: boolean;
  description?: string;
}

type ScheduleView = 'Week' | 'Day' | 'Month' | 'List';
type DisplayMode = 'timeline' | 'list';

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const DAY_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const COLORS = [
  { label: 'İndigo', value: 'bg-indigo-500', hex: '#6366f1' },
  { label: 'Mavi', value: 'bg-blue-500', hex: '#3b82f6' },
  { label: 'Yeşil', value: 'bg-emerald-500', hex: '#10b981' },
  { label: 'Sarı', value: 'bg-amber-500', hex: '#f59e0b' },
  { label: 'Kırmızı', value: 'bg-rose-500', hex: '#f43f5e' },
  { label: 'Mor', value: 'bg-purple-500', hex: '#a855f7' },
  { label: 'Pembe', value: 'bg-pink-500', hex: '#ec4899' },
  { label: 'Turuncu', value: 'bg-orange-500', hex: '#f97316' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function colorBgToHex(bg: string): string {
  return COLORS.find(c => c.value === bg)?.hex ?? '#6366f1';
}

function generateScheduleICS(items: ScheduleItem[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NEXUS//Program Takvimi//TR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-NEXUS-TYPE:SCHEDULE',
  ];

  // Use next week's dates as reference dates for the weekly schedule
  const refMonday = new Date();
  refMonday.setDate(refMonday.getDate() - refMonday.getDay() + 1); // This week's Monday

  items.forEach(item => {
    const refDate = addDays(refMonday, (item.dayOfWeek - 1 + 7) % 7);
    const dateStr = format(refDate, 'yyyyMMdd');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${item.id}@nexus-schedule`);
    lines.push(`DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}`);
    lines.push(`SUMMARY:${item.title}`);
    if (item.description) lines.push(`DESCRIPTION:${item.description}`);

    if (item.isAllDay) {
      lines.push(`DTSTART;VALUE=DATE:${dateStr}`);
      lines.push(`DTEND;VALUE=DATE:${dateStr}`);
    } else {
      lines.push(`DTSTART:${dateStr}T${item.startTime.replace(':', '')}00`);
      lines.push(`DTEND:${dateStr}T${item.endTime.replace(':', '')}00`);
    }

    lines.push(`X-NEXUS-DAY-OF-WEEK:${item.dayOfWeek}`);
    lines.push(`X-NEXUS-COLOR:${item.color}`);
    lines.push('RRULE:FREQ=WEEKLY');
    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function parseScheduleICS(text: string): { items: ScheduleItem[]; error?: string } {
  if (!text.includes('BEGIN:VCALENDAR')) return { items: [], error: 'Geçerli bir ICS dosyası değil.' };
  if (!text.includes('BEGIN:VEVENT')) return { items: [], error: 'Hiçbir etkinlik bulunamadı.' };

  const items: ScheduleItem[] = [];
  const eventBlocks = text.split('BEGIN:VEVENT').slice(1);

  eventBlocks.forEach(block => {
    const lines = block.split(/\r?\n/);
    const props: Record<string, string> = {};
    lines.forEach(line => {
      const idx = line.indexOf(':');
      if (idx > 0) {
        const key = line.slice(0, idx).trim();
        const val = line.slice(idx + 1).trim();
        props[key] = val;
        props[key.split(';')[0]] = val;
      }
    });

    const title = props['SUMMARY'] || 'Adsız';
    const dayRaw = props['X-NEXUS-DAY-OF-WEEK'];
    const color = props['X-NEXUS-COLOR'] || 'bg-indigo-500';
    const isAllDay = !!(props['DTSTART'] && props['DTSTART;VALUE=DATE']);
    const description = props['DESCRIPTION'] || '';

    // Parse times from DTSTART / DTEND
    const dtStart = props['DTSTART'] || '';
    const dtEnd = props['DTEND'] || '';
    let startTime = '09:00';
    let endTime = '10:00';

    const timeMatch = (s: string) => s.match(/T(\d{2})(\d{2})/);
    const sm = timeMatch(dtStart);
    const em = timeMatch(dtEnd);
    if (sm) startTime = `${sm[1]}:${sm[2]}`;
    if (em) endTime = `${em[1]}:${em[2]}`;

    // Determine dayOfWeek
    let dayOfWeek: DayOfWeek = 1;
    if (dayRaw !== undefined) {
      const d = parseInt(dayRaw, 10);
      if (d >= 0 && d <= 6) dayOfWeek = d as DayOfWeek;
    } else if (dtStart.length >= 8) {
      const y = parseInt(dtStart.slice(0, 4));
      const m = parseInt(dtStart.slice(4, 6)) - 1;
      const d = parseInt(dtStart.slice(6, 8));
      dayOfWeek = new Date(y, m, d).getDay() as DayOfWeek;
    }

    items.push({
      id: crypto.randomUUID(),
      title,
      dayOfWeek,
      startTime,
      endTime,
      color: COLORS.find(c => c.value === color) ? color : 'bg-indigo-500',
      isAllDay,
      description,
    });
  });

  return { items };
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ScheduleProps {
  onClose: () => void;
}

export default function Schedule({ onClose }: ScheduleProps) {
  const STORAGE_KEY = 'nexus-schedule-items';

  const [items, setItems] = useState<ScheduleItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  });

  const [view, setView] = useState<ScheduleView>('Week');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('timeline');
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(new Date().getDay() as DayOfWeek);

  // Add / Edit modal
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    dayOfWeek: 1 as DayOfWeek,
    startTime: '09:00',
    endTime: '10:00',
    color: 'bg-indigo-500',
    isAllDay: false,
    description: '',
  });

  // ICS import
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importMode, setImportMode] = useState<'paste' | 'file'>('paste');
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState<ScheduleItem[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Week timeline scroll
  const timelineRef = useRef<HTMLDivElement>(null);

  // Current time state for the live indicator
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  // Auto-scroll timeline to current time
  useEffect(() => {
    if ((view === 'Week' || view === 'Day') && displayMode === 'timeline' && timelineRef.current) {
      const minutes = now.getHours() * 60 + now.getMinutes();
      timelineRef.current.scrollTo({ top: Math.max(0, minutes - 120), behavior: 'smooth' });
    }
  }, [view, displayMode]);

  // ─ Persistence ─────────────────────────────────────────────────────────────

  const saveItem = () => {
    if (!form.title.trim()) return;
    if (!form.isAllDay && !form.startTime) return;

    if (editingId) {
      setItems(prev => prev.map(i => i.id === editingId ? { ...form, id: editingId } : i));
    } else {
      setItems(prev => [...prev, { ...form, id: crypto.randomUUID() }]);
    }
    closeModal();
  };

  const deleteItem = (id: string) => {
    if (!window.confirm('Bu program öğesini silmek istiyor musunuz?')) return;
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const openCreate = (day?: DayOfWeek) => {
    setEditingId(null);
    setForm({
      title: '',
      dayOfWeek: day ?? selectedDay,
      startTime: '09:00',
      endTime: '10:00',
      color: 'bg-indigo-500',
      isAllDay: false,
      description: '',
    });
    setIsAdding(true);
  };

  const openEdit = (item: ScheduleItem) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      dayOfWeek: item.dayOfWeek,
      startTime: item.startTime,
      endTime: item.endTime,
      color: item.color,
      isAllDay: item.isAllDay,
      description: item.description || '',
    });
    setIsAdding(true);
  };

  const closeModal = () => {
    setIsAdding(false);
    setEditingId(null);
  };

  // ─ ICS ─────────────────────────────────────────────────────────────────────

  const handleExport = () => {
    const content = generateScheduleICS(items);
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-program-${format(new Date(), 'yyyy-MM-dd')}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportParse = (text: string) => {
    setImportText(text);
    setImportError(null);
    setImportPreview(null);
    if (!text.trim()) return;
    const { items: parsed, error } = parseScheduleICS(text);
    if (error) { setImportError(error); return; }
    setImportPreview(parsed);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setImportMode('paste');
      handleImportParse(ev.target?.result as string);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportAll = () => {
    if (!importPreview || importPreview.length === 0) return;
    setItems(prev => [...prev, ...importPreview]);
    setIsImportOpen(false);
    setImportText('');
    setImportPreview(null);
    setImportError(null);
  };

  // ─ Render helpers ───────────────────────────────────────────────────────────

  const weekOrder: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0]; // Mon–Sun

  const itemsForDay = (day: DayOfWeek) =>
    items.filter(i => i.dayOfWeek === day).sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  // ─── Timeline column layout (like calendar) ─────────────────────────────────
  const layoutDayTimeline = (dayItems: ScheduleItem[]) => {
    type Ev = ScheduleItem & { top: number; bottom: number; colIndex?: number; widthPct?: number; leftPct?: number };
    const timed: Ev[] = dayItems
      .filter(e => !e.isAllDay)
      .map(e => ({
        ...e,
        top: timeToMinutes(e.startTime),
        bottom: Math.max(timeToMinutes(e.startTime) + 1, timeToMinutes(e.endTime || e.startTime) || timeToMinutes(e.startTime) + 50),
      }))
      .sort((a, b) => a.top - b.top);

    const processed: Ev[] = [];
    let cluster: Ev[] = [];
    let clusterEnd = 0;

    const pack = (items: Ev[]) => {
      const cols: Ev[][] = [];
      items.forEach(ev => {
        let placed = false;
        for (let i = 0; i < cols.length; i++) {
          if (cols[i][cols[i].length - 1].bottom <= ev.top) {
            cols[i].push(ev); ev.colIndex = i; placed = true; break;
          }
        }
        if (!placed) { ev.colIndex = cols.length; cols.push([ev]); }
      });
      items.forEach(ev => {
        ev.widthPct = 100 / cols.length;
        ev.leftPct = (ev.colIndex ?? 0) * (100 / cols.length);
      });
      processed.push(...items);
    };

    timed.forEach(e => {
      if (e.top >= clusterEnd) { if (cluster.length) pack(cluster); cluster = [e]; clusterEnd = e.bottom; }
      else { cluster.push(e); clusterEnd = Math.max(clusterEnd, e.bottom); }
    });
    if (cluster.length) pack(cluster);
    return processed;
  };

  // ─── VIEWS ──────────────────────────────────────────────────────────────────

  const renderWeekTimeline = () => (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-white/10 bg-white/5 flex-shrink-0">
        <div />
        {weekOrder.map(day => (
          <button
            key={day}
            onClick={() => { setSelectedDay(day); setView('Day'); }}
            className={cn(
              'py-3 text-center border-l border-white/5 hover:bg-white/5 transition-colors',
              selectedDay === day && 'bg-indigo-500/10'
            )}
          >
            <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{DAY_SHORT[day]}</div>
            <div className={cn('text-base font-bold mt-0.5', day === (new Date().getDay() as DayOfWeek) && 'text-indigo-400')}>
              {day === (new Date().getDay() as DayOfWeek) ? '●' : '○'}
            </div>
          </button>
        ))}
      </div>

      <div ref={timelineRef} className="flex-1 overflow-y-auto relative scroll-smooth">
        <div className="relative min-h-[1440px] pt-4 pb-12">
          {/* Hour lines */}
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="absolute left-0 right-0 flex items-start" style={{ top: `${i * 60 + 16}px`, height: '60px' }}>
              <div className="w-14 text-center pr-2 text-[11px] text-neutral-500 font-medium -mt-2">
                {`${i.toString().padStart(2, '0')}:00`}
              </div>
              <div className="flex-1 border-t border-white/5 h-full" />
            </div>
          ))}

          {/* Current time badge on the hour axis */}
          {(() => {
            const minutes = now.getHours() * 60 + now.getMinutes();
            const topPx = minutes + 16;
            const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            return (
              <div
                className="absolute left-0 z-30 pointer-events-none"
                style={{ top: `${topPx}px` }}
              >
                <div className="w-14 text-center -top-[9px] relative">
                  <span className="text-[11px] font-bold text-rose-500 bg-[#121218] border border-rose-500/30 px-1.5 py-0.5 rounded-md shadow-sm">
                    {timeStr}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Event columns */}
          <div className="absolute left-14 right-0 top-0 bottom-0 grid grid-cols-7 pointer-events-none">
            {weekOrder.map(day => {
              const isToday = day === (now.getDay() as DayOfWeek);
              const dayItems = layoutDayTimeline(itemsForDay(day));
              return (
                <div key={day} className="relative border-l border-white/5">
                  {/* Current time indicator line for today */}
                  {isToday && (
                    <div
                      className="absolute left-0 right-0 z-20 pointer-events-none"
                      style={{ top: `${now.getHours() * 60 + now.getMinutes() + 16}px` }}
                    >
                      <div className="h-[2px] w-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.45)]" />
                      <div className="absolute -left-[4px] -top-[3px] w-[8px] h-[8px] rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)] animate-pulse" />
                    </div>
                  )}

                  {/* All-day strip */}
                  {itemsForDay(day).filter(e => e.isAllDay).map(e => (
                    <div
                      key={e.id}
                      className={cn('absolute top-1 left-1 right-1 rounded px-1 py-0.5 text-[10px] font-bold text-white truncate pointer-events-auto cursor-pointer z-10', e.color)}
                      title={e.title}
                      onClick={() => openEdit(e)}
                    >
                      {e.title}
                    </div>
                  ))}
                  {dayItems.map(e => (
                    <div
                      key={e.id}
                      className={cn('absolute p-1.5 rounded-md shadow-lg flex flex-col group text-white border border-white/10 backdrop-blur-sm bg-opacity-90 transition-all hover:bg-opacity-100 hover:z-20 pointer-events-auto cursor-pointer', e.color)}
                      style={{
                        top: `${e.top + 16}px`,
                        height: `${Math.max(e.bottom - e.top, 26)}px`,
                        minHeight: '26px',
                        zIndex: 10,
                        left: `${e.leftPct}%`,
                        width: `calc(${e.widthPct}% - 3px)`,
                      }}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <h4 className="font-bold text-[11px] leading-tight truncate">{e.title}</h4>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={ev => { ev.stopPropagation(); openEdit(e); }} className="text-white/70 hover:text-white p-0.5"><Edit2 size={10} /></button>
                          <button onClick={ev => { ev.stopPropagation(); deleteItem(e.id); }} className="text-white/70 hover:text-white p-0.5"><Trash2 size={10} /></button>
                        </div>
                      </div>
                      <div className="text-[10px] text-white/80 mt-auto">{e.startTime}{e.endTime ? ` – ${e.endTime}` : ''}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  const renderWeekList = () => (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {weekOrder.map(day => {
        const dayItems = itemsForDay(day);
        return (
          <div key={day}>
            <div className="flex items-center gap-3 mb-2">
              <span className={cn(
                'text-sm font-bold px-3 py-1 rounded-full',
                day === (new Date().getDay() as DayOfWeek) ? 'bg-indigo-600 text-white' : 'bg-white/5 text-neutral-400'
              )}>{DAY_NAMES[day]}</span>
              <div className="flex-1 h-px bg-white/5" />
              <button onClick={() => openCreate(day)} className="text-neutral-500 hover:text-indigo-400 transition-colors p-1">
                <Plus size={16} />
              </button>
            </div>
            {dayItems.length === 0 ? (
              <p className="text-xs text-neutral-600 pl-2">— Boş —</p>
            ) : (
              <div className="space-y-1.5 pl-2">
                {dayItems.map(e => (
                  <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 group hover:bg-white/[0.07] transition-colors">
                    <div className={cn('w-1 h-10 rounded-full flex-shrink-0', e.color)} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{e.title}</p>
                      <p className="text-[11px] text-neutral-500 flex items-center gap-1 mt-0.5">
                        {e.isAllDay ? (
                          <><CalendarDays size={10} /> Tüm Gün</>
                        ) : (
                          <><Clock size={10} /> {e.startTime}{e.endTime ? ` – ${e.endTime}` : ''}</>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(e)} className="text-neutral-500 hover:text-indigo-400 transition-colors p-1"><Edit2 size={14} /></button>
                      <button onClick={() => deleteItem(e.id)} className="text-neutral-500 hover:text-rose-500 transition-colors p-1"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderDayView = () => {
    const dayItems = itemsForDay(selectedDay);
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Day selector */}
        <div className="flex gap-1 p-3 border-b border-white/10 bg-white/5 flex-shrink-0 overflow-x-auto no-scrollbar">
          {weekOrder.map(day => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={cn(
                'flex-shrink-0 px-4 py-2 rounded-lg text-sm font-bold transition-all',
                selectedDay === day ? 'bg-indigo-600 text-white' : 'bg-white/5 text-neutral-400 hover:text-white'
              )}
            >
              {DAY_SHORT[day]}
            </button>
          ))}
        </div>

        {/* All-day events strip */}
        {dayItems.filter(e => e.isAllDay).length > 0 && (
          <div className="border-b border-white/10 bg-white/5 p-2 pl-14 pr-4 space-y-1 z-10 shadow-sm relative flex-shrink-0">
            {dayItems.filter(e => e.isAllDay).map(e => (
              <div key={e.id} className={cn('px-3 py-1.5 rounded-md text-xs font-bold text-white shadow-sm flex justify-between items-center group', e.color)}>
                <span>{e.title}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(e)} className="text-white/70 hover:text-white p-0.5"><Edit2 size={13} /></button>
                  <button onClick={() => deleteItem(e.id)} className="text-white/70 hover:text-white p-0.5"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {displayMode === 'timeline' ? (
          <div ref={timelineRef} className="flex-1 overflow-y-auto relative scroll-smooth">
            <div className="relative min-h-[1440px] pt-4 pb-12">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-full flex items-start cursor-pointer group hover:bg-white/5 transition-colors"
                  style={{ top: `${i * 60 + 16}px`, height: '60px' }}
                  onClick={() => { openCreate(selectedDay); setForm(f => ({ ...f, startTime: `${i.toString().padStart(2, '0')}:00`, endTime: `${(i + 1).toString().padStart(2, '0')}:00` })); }}
                >
                  <div className="w-14 text-center pr-2 text-[11px] text-neutral-500 font-medium -mt-2 group-hover:text-indigo-400 transition-colors">
                    {`${i.toString().padStart(2, '0')}:00`}
                  </div>
                  <div className="flex-1 border-t border-white/5 h-full group-hover:border-indigo-500/30 transition-colors" />
                </div>
              ))}

              {/* Current time indicator */}
              {selectedDay === (now.getDay() as DayOfWeek) && (() => {
                const minutes = now.getHours() * 60 + now.getMinutes();
                const topPx = minutes + 16;
                const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                return (
                  <div
                    className="absolute left-0 right-0 z-30 pointer-events-none"
                    style={{ top: `${topPx}px` }}
                  >
                    {/* Time label - overlays the hour label column */}
                    <div className="absolute left-0 -top-[9px] w-14 text-center z-10">
                      <span className="text-[11px] font-bold text-rose-500 bg-[#121218] border border-rose-500/30 px-1.5 py-0.5 rounded-md shadow-sm">
                        {timeStr}
                      </span>
                    </div>
                    {/* Dot at the edge of the time column */}
                    <div className="absolute left-[52px] -top-[5px] w-[11px] h-[11px] rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse z-10" />
                    {/* Red line spanning the calendar area */}
                    <div className="absolute left-[56px] right-0 top-0 h-[2px] bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.4)]" />
                  </div>
                );
              })()}
              <div className="absolute left-14 right-4 top-0 bottom-0 pointer-events-none">
                {layoutDayTimeline(dayItems).map(e => (
                  <div
                    key={e.id}
                    className={cn('absolute p-2 rounded-lg shadow-lg flex flex-col group text-white border border-white/10 backdrop-blur-sm bg-opacity-90 transition-all hover:bg-opacity-100 hover:z-20 pointer-events-auto', e.color)}
                    style={{
                      top: `${e.top + 16}px`,
                      height: `${Math.max(e.bottom - e.top, 30)}px`,
                      minHeight: '30px',
                      zIndex: 10,
                      left: `${e.leftPct}%`,
                      width: `calc(${e.widthPct}% - 4px)`,
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-sm leading-tight truncate">{e.title}</h4>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={ev => { ev.stopPropagation(); openEdit(e); }} className="text-white/70 hover:text-white p-0.5 flex-shrink-0"><Edit2 size={14} /></button>
                        <button onClick={ev => { ev.stopPropagation(); deleteItem(e.id); }} className="text-white/70 hover:text-white p-0.5 flex-shrink-0"><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <div className="text-[11px] font-medium text-white/80 mt-auto pt-1">
                      {e.startTime}{e.endTime ? ` – ${e.endTime}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {dayItems.length === 0 ? (
              <div className="text-neutral-500 py-8 text-center">Bu gün için program yok.<br /><span className="text-xs">+ Ekle butonuna tıklayın</span></div>
            ) : dayItems.map(e => (
              <div key={e.id} className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5 group hover:bg-white/[0.07] transition-colors">
                <div className={cn('w-1.5 h-12 rounded-full flex-shrink-0', e.color)} />
                <div className="flex-1">
                  <p className="font-bold">{e.title}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {e.isAllDay ? 'Tüm Gün' : `${e.startTime} – ${e.endTime}`}
                  </p>
                  {e.description && <p className="text-xs text-neutral-600 mt-1 truncate">{e.description}</p>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(e)} className="text-neutral-500 hover:text-indigo-400 transition-colors p-2"><Edit2 size={16} /></button>
                  <button onClick={() => deleteItem(e.id)} className="text-neutral-500 hover:text-rose-500 transition-colors p-2"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderMonthView = () => {
    // Show a grid: days as columns, time slots as rows (like a weekly spread per month repeating)
    // Since schedule items repeat every week, month view shows the weekly template repeated over 4-5 week rows
    const rows = [0, 1, 2, 3]; // 4 weeks
    return (
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-xs text-neutral-500 mb-4 flex items-center gap-1.5">
          <RotateCcw size={12} />
          Program her hafta aynı şekilde tekrar eder. Aylık görünüm haftalık şablonu 4 kez gösterir.
        </p>
        <div className="space-y-6">
          {rows.map(week => (
            <div key={week}>
              <div className="text-xs font-bold text-neutral-500 uppercase mb-2">{week + 1}. Hafta</div>
              <div className="grid grid-cols-7 gap-1">
                {weekOrder.map(day => {
                  const dayItems = itemsForDay(day);
                  return (
                    <div key={day} className="bg-white/5 rounded-xl p-2 min-h-[80px]">
                      <div className={cn(
                        'text-[10px] font-bold uppercase mb-1',
                        day === (new Date().getDay() as DayOfWeek) ? 'text-indigo-400' : 'text-neutral-500'
                      )}>{DAY_SHORT[day]}</div>
                      <div className="space-y-1">
                        {dayItems.map(e => (
                          <div
                            key={e.id}
                            className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold text-white truncate cursor-pointer', e.color)}
                            title={`${e.title} ${e.isAllDay ? '(Tüm Gün)' : `${e.startTime}–${e.endTime}`}`}
                            onClick={() => openEdit(e)}
                          >
                            {e.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderListView = () => (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {items.length === 0 ? (
        <div className="text-neutral-500 py-16 text-center text-sm">
          Henüz program eklenmedi.<br />
          <span className="text-xs">Sağ üstteki <strong>+ Ekle</strong> butonuna tıklayın.</span>
        </div>
      ) : (
        [...items]
          .sort((a, b) => weekOrder.indexOf(a.dayOfWeek) - weekOrder.indexOf(b.dayOfWeek) || timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
          .map(e => (
            <div key={e.id} className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5 group hover:bg-white/[0.07] transition-colors">
              <div className={cn('w-1.5 h-12 rounded-full flex-shrink-0', e.color)} />
              <div className="w-24 flex-shrink-0">
                <span className={cn(
                  'text-xs font-bold px-2 py-0.5 rounded-full',
                  e.dayOfWeek === (new Date().getDay() as DayOfWeek) ? 'bg-indigo-600 text-white' : 'bg-white/5 text-neutral-400'
                )}>{DAY_NAMES[e.dayOfWeek]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{e.title}</p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {e.isAllDay ? 'Tüm Gün' : `${e.startTime} – ${e.endTime}`}
                </p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(e)} className="text-neutral-500 hover:text-indigo-400 transition-colors p-2"><Edit2 size={16} /></button>
                <button onClick={() => deleteItem(e.id)} className="text-neutral-500 hover:text-rose-500 transition-colors p-2"><Trash2 size={16} /></button>
              </div>
            </div>
          ))
      )}
    </div>
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="w-full max-w-6xl h-[90vh] glass-panel rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-display font-bold flex items-center gap-2">
                <RotateCcw size={18} className="text-indigo-400" />
                Haftalık Program
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">Tarihe bağlı olmayan sabit haftalık program</p>
            </div>

            {/* View selector */}
            <div className="flex bg-white/5 p-1 rounded-lg border border-white/10 ml-4">
              {(['Week', 'Day', 'Month', 'List'] as ScheduleView[]).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-bold transition-all',
                    view === v ? 'bg-indigo-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
                  )}
                >
                  {v === 'Week' ? 'Hafta' : v === 'Day' ? 'Gün' : v === 'Month' ? 'Ay' : 'Liste'}
                </button>
              ))}
            </div>

            {/* Timeline / List toggle for Week & Day */}
            {(view === 'Week' || view === 'Day') && (
              <button
                onClick={() => setDisplayMode(m => m === 'timeline' ? 'list' : 'timeline')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all',
                  displayMode === 'timeline'
                    ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30'
                    : 'bg-white/5 text-neutral-400 border-white/10 hover:bg-white/10'
                )}
              >
                {displayMode === 'timeline' ? <><List size={13} /> Liste</> : <><Clock size={13} /> Saatli</>}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* ICS Import / Export */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
              <button
                onClick={() => { setIsImportOpen(true); setImportMode('paste'); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 transition-all"
                title="İçe Aktar (.ics)"
              >
                <Download size={14} /> İçe Aktar
              </button>
              <div className="w-px h-5 bg-white/10" />
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold text-sky-400 hover:bg-sky-500/10 transition-all"
                title="Dışa Aktar (.ics)"
              >
                <Upload size={14} /> Dışa Aktar
              </button>
            </div>

            <button
              onClick={() => openCreate()}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-lg shadow-indigo-500/20 transition-all text-sm font-bold"
            >
              <Plus size={16} /> Ekle
            </button>

            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors text-neutral-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {view === 'Week' && displayMode === 'timeline' && renderWeekTimeline()}
          {view === 'Week' && displayMode === 'list' && renderWeekList()}
          {view === 'Day' && renderDayView()}
          {view === 'Month' && renderMonthView()}
          {view === 'List' && renderListView()}
        </div>

        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" accept=".ics,text/calendar" className="hidden" onChange={handleFileUpload} />
      </div>

      {/* ── Add / Edit Modal ── */}
      {isAdding && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm glass-panel p-6 rounded-3xl border border-white/10 shadow-2xl">
            <h3 className="text-xl font-bold mb-5">{editingId ? 'Program Düzenle' : 'Program Ekle'}</h3>
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Başlık</label>
                <input
                  autoFocus
                  type="text"
                  placeholder="Program başlığı"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              {/* Day of week */}
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Gün</label>
                <div className="grid grid-cols-7 gap-1">
                  {weekOrder.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, dayOfWeek: day }))}
                      className={cn(
                        'py-1.5 rounded-lg text-xs font-bold transition-all',
                        form.dayOfWeek === day ? 'bg-indigo-600 text-white' : 'bg-white/5 text-neutral-400 hover:bg-white/10'
                      )}
                    >
                      {DAY_SHORT[day]}
                    </button>
                  ))}
                </div>
              </div>

              {/* All day toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="schedule-allday"
                  checked={form.isAllDay}
                  onChange={e => setForm(f => ({ ...f, isAllDay: e.target.checked }))}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="schedule-allday" className="text-sm text-neutral-300 cursor-pointer select-none">Tüm Gün</label>
              </div>

              {/* Times */}
              {!form.isAllDay && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-neutral-400 mb-1">Başlangıç</label>
                    <input
                      type="time"
                      value={form.startTime}
                      onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 text-sm [color-scheme:dark]"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-neutral-400 mb-1">Bitiş</label>
                    <input
                      type="time"
                      value={form.endTime}
                      onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 text-sm [color-scheme:dark]"
                    />
                  </div>
                </div>
              )}

              {/* Color */}
              <div>
                <label className="block text-xs text-neutral-400 mb-2">Renk</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, color: c.value }))}
                      className={cn(
                        'w-7 h-7 rounded-full transition-all',
                        c.value,
                        form.color === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-black/50 scale-110' : 'opacity-70 hover:opacity-100'
                      )}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Açıklama <span className="text-neutral-600">(opsiyonel)</span></label>
                <input
                  type="text"
                  placeholder="Kısa açıklama"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-sm">İptal</button>
                <button
                  type="button"
                  onClick={saveItem}
                  disabled={!form.title.trim()}
                  className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {editingId ? 'Güncelle' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ICS Import Modal ── */}
      {isImportOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg glass-panel rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-white/5">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2"><Download size={18} className="text-emerald-400" /> Program İçe Aktar</h3>
                <p className="text-xs text-neutral-500 mt-1">NEXUS program formatında dışa aktarılmış .ics dosyası</p>
              </div>
              <button onClick={() => { setIsImportOpen(false); setImportText(''); setImportPreview(null); setImportError(null); }} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-neutral-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="flex gap-2 px-6 pt-4">
              <button
                onClick={() => setImportMode('paste')}
                className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all',
                  importMode === 'paste' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-neutral-400 hover:text-white border border-white/10')}
              >
                <ClipboardPaste size={14} /> Yapıştır
              </button>
              <button
                onClick={() => { setImportMode('file'); fileInputRef.current?.click(); }}
                className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all',
                  importMode === 'file' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-neutral-400 hover:text-white border border-white/10')}
              >
                <FileUp size={14} /> Dosya
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <textarea
                value={importText}
                onChange={e => handleImportParse(e.target.value)}
                placeholder={'BEGIN:VCALENDAR\nVERSION:2.0\n...'}
                className="w-full h-36 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm font-mono resize-none focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-neutral-600"
                spellCheck={false}
              />
              {importError && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                  <AlertTriangle size={16} className="text-rose-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-400">{importError}</p>
                </div>
              )}
              {importPreview && importPreview.length > 0 && !importError && (
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-neutral-400 flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    {importPreview.length} program öğesi bulundu
                  </h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
                    {importPreview.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                        <div className={cn('w-1 h-8 rounded-full flex-shrink-0', item.color)} />
                        <div>
                          <p className="text-sm font-bold">{item.title}</p>
                          <p className="text-[11px] text-neutral-500">{DAY_NAMES[item.dayOfWeek]} · {item.isAllDay ? 'Tüm Gün' : `${item.startTime} – ${item.endTime}`}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 p-6 pt-4 border-t border-white/5">
              <button onClick={() => { setIsImportOpen(false); setImportText(''); setImportPreview(null); setImportError(null); }} className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors font-medium text-sm">İptal</button>
              <button
                onClick={handleImportAll}
                disabled={!importPreview || importPreview.length === 0}
                className={cn('flex-1 px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2',
                  importPreview && importPreview.length > 0 ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-white/5 text-neutral-600 cursor-not-allowed')}
              >
                <Download size={14} /> Tümünü Aktar
                {importPreview && importPreview.length > 0 && (
                  <span className="bg-white/20 px-1.5 py-0.5 rounded-md text-xs">{importPreview.length}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
