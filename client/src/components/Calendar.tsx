import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, ChevronRight, Plus, 
  MoreHorizontal, Clock, MapPin, Users, Trash2, Edit2
} from 'lucide-react';
import { 
  format, addMonths, subMonths, startOfMonth, 
  endOfMonth, startOfWeek, endOfWeek, isSameMonth, 
  isSameDay, addDays, subDays, addWeeks, subWeeks, eachDayOfInterval 
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { t, getLang } from '../lib/i18n';
import { api } from '../lib/api';

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState('Month');
  const [isAdding, setIsAdding] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [tasks, setTasks] = useState<any[]>([]);
  const [newEventDate, setNewEventDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newEventTime, setNewEventTime] = useState('09:00');
  const [newEventEndTime, setNewEventEndTime] = useState('');
  const [newEventIsAllDay, setNewEventIsAllDay] = useState(false);
  const [agendaFilter, setAgendaFilter] = useState<'upcoming' | 'past'>('upcoming');
  const [isAgendaMinimized, setIsAgendaMinimized] = useState(true);
  const [isWeekTimeline, setIsWeekTimeline] = useState(false);

  const weekStartsOn = (parseInt(localStorage.getItem('nexus-weekstart') || '1') as 0 | 1);

  const fetchTasks = async () => {
    try {
      const data = await api.getTasks();
      setTasks(data.filter((t: any) => t.due_date));
    } catch (e) {
      console.error('Failed to fetch tasks for calendar', e);
    }
  };

  React.useEffect(() => {
    fetchTasks();
  }, []);

  // Current time state for the live indicator
  const [now, setNow] = useState(new Date());
  const timeIndicatorRef = useRef<HTMLDivElement>(null);
  const weekTimelineScrollRef = useRef<HTMLDivElement>(null);
  const didAutoScrollWeekRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (view !== 'Week' || !isWeekTimeline) {
      didAutoScrollWeekRef.current = false;
      return;
    }

    const weekStart = startOfWeek(selectedDate, { weekStartsOn });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn });
    const isTodayInShownWeek = now >= weekStart && now <= weekEnd;
    if (!isTodayInShownWeek || didAutoScrollWeekRef.current) return;

    const target = weekTimelineScrollRef.current;
    if (!target) return;

    const currentMinute = now.getHours() * 60 + now.getMinutes();
    target.scrollTo({ top: Math.max(0, currentMinute - 120), behavior: 'smooth' });
    didAutoScrollWeekRef.current = true;
  }, [view, isWeekTimeline, selectedDate, now, weekStartsOn]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn });
  const endDate = endOfWeek(monthEnd, { weekStartsOn });

  let calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  // Always render 6 rows (42 cells)
  while (calendarDays.length < 42) {
    calendarDays.push(addDays(calendarDays[calendarDays.length - 1], 1));
  }

  const handlePrev = () => {
    if (view === 'Day') {
      const newDate = subDays(selectedDate, 1);
      setSelectedDate(newDate);
      setCurrentDate(newDate);
    } else if (view === 'Week') {
      const newDate = subWeeks(selectedDate, 1);
      setSelectedDate(newDate);
      setCurrentDate(newDate);
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (view === 'Day') {
      const newDate = addDays(selectedDate, 1);
      setSelectedDate(newDate);
      setCurrentDate(newDate);
    } else if (view === 'Week') {
      const newDate = addWeeks(selectedDate, 1);
      setSelectedDate(newDate);
      setCurrentDate(newDate);
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const events = tasks.map(task => ({
    id: task.id,
    title: task.title,
    date: new Date(task.due_date),
    endDate: task.due_end_date ? new Date(task.due_end_date) : null,
    color: task.priority === 'Critical' ? 'bg-rose-500' : task.priority === 'High' ? 'bg-amber-500' : 'bg-indigo-500',
    is_all_day: task.is_all_day
  }));
  const weekDays = eachDayOfInterval({
    start: startOfWeek(selectedDate, { weekStartsOn }),
    end: endOfWeek(selectedDate, { weekStartsOn })
  });

  const openCreateEventModal = (date?: Date) => {
    const targetDate = date ?? selectedDate;
    setSelectedDate(targetDate);
    setNewEventDate(format(targetDate, 'yyyy-MM-dd'));
    setEditingEventId(null);
    setNewEventTitle('');
    setNewEventTime('09:00');
    setNewEventEndTime('');
    setNewEventIsAllDay(false);
    setIsAdding(true);
  };

  const openEditEventModal = (event: any) => {
    const start = event.date as Date;
    const end = event.endDate as Date | null;
    setSelectedDate(start);
    setNewEventDate(format(start, 'yyyy-MM-dd'));
    setNewEventTitle(event.title || '');
    setNewEventIsAllDay(!!event.is_all_day);
    setNewEventTime(format(start, 'HH:mm'));
    setNewEventEndTime(end ? format(end, 'HH:mm') : '');
    setEditingEventId(event.id);
    setIsAdding(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle || !newEventTime) return;
    
    // Use selectedDate - format it to YYYY-MM-DD and combine with time
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    const dateObj = new Date(`${selectedDateStr}T${newEventTime}`);

    let dueEndDate: string | undefined = undefined;
    if (!newEventIsAllDay && newEventEndTime) {
      const endDateObj = new Date(`${selectedDateStr}T${newEventEndTime}`);
      if (endDateObj.getTime() <= dateObj.getTime()) {
        alert('Bitiş saati başlangıç saatinden sonra olmalıdır.');
        return;
      }
      dueEndDate = endDateObj.toISOString();
    }

    try {
      if (editingEventId) {
        await api.updateTask(editingEventId, {
          title: newEventTitle,
          due_date: newEventIsAllDay ? `${selectedDateStr}T00:00:00.000Z` : dateObj.toISOString(),
          due_end_date: dueEndDate || null,
          is_all_day: newEventIsAllDay,
        });
      } else {
        await api.createTask({
          id: crypto.randomUUID(),
          title: newEventTitle,
          due_date: newEventIsAllDay ? `${selectedDateStr}T00:00:00.000Z` : dateObj.toISOString(),
          due_end_date: dueEndDate,
          is_all_day: newEventIsAllDay,
          priority: 'Medium',
          status: 'Todo'
        });
      }
      setNewEventTitle('');
      setNewEventEndTime('');
      setNewEventIsAllDay(false);
      setEditingEventId(null);
      setIsAdding(false);
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm(t('Msg_DeleteConfirm'))) return;
    try {
      await api.deleteTask(id);
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-display font-bold capitalize">
            {view === 'Day' 
              ? format(selectedDate, 'dd MMMM yyyy', { locale: tr })
              : view === 'Week'
              ? `${format(startOfWeek(selectedDate, { weekStartsOn }), 'd MMM', { locale: tr })} - ${format(endOfWeek(selectedDate, { weekStartsOn }), 'd MMM yyyy', { locale: tr })}`
              : format(currentDate, 'MMMM yyyy', { locale: tr })}
          </h2>
          <div className="flex items-center bg-white/5 rounded-lg border border-white/10 p-1">
            <button onClick={handlePrev} className="p-1.5 hover:bg-white/10 rounded-md transition-colors">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()); }} className="px-3 py-1 text-sm font-medium hover:bg-white/10 rounded-md transition-colors">
              {t('Cal_Today')}
            </button>
            <button onClick={handleNext} className="p-1.5 hover:bg-white/10 rounded-md transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {view === 'Week' && (
            <button
              onClick={() => setIsWeekTimeline(v => !v)}
              className={cn(
                "px-3 py-2 rounded-lg border text-sm font-medium transition-all",
                isWeekTimeline
                  ? "bg-indigo-600 text-white border-indigo-500"
                  : "bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10"
              )}
              title="Haftalık saat çizelgesi"
            >
              {isWeekTimeline ? 'Liste Görünümü' : 'Saatli Görünüm'}
            </button>
          )}
          <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
            {[
              { id: 'Day', label: t('Cal_View_Day') },
              { id: 'Week', label: t('Cal_View_Week') },
              { id: 'Month', label: t('Cal_View_Month') },
              { id: 'Agenda', label: t('Cal_View_Agenda') }
            ].map((v) => (
              <button 
                key={v.id}
                onClick={() => setView(v.id)}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                  view === v.id ? "bg-indigo-600 text-white shadow-sm" : "text-neutral-400 hover:text-white"
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
          <button onClick={() => openCreateEventModal(selectedDate)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-lg shadow-indigo-500/20 transition-all">
            <Plus size={18} />
            <span>{t('Cal_NewEvent')}</span>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="glass-panel rounded-3xl border border-white/5 flex flex-col flex-1 min-h-0 overflow-hidden">
        {view === 'Month' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
            <div className="grid grid-cols-7 border-b border-white/10 bg-white/5">
              {(weekStartsOn === 1 ? ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'] : ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']).map((day) => (
                <div key={day} className="py-4 text-center text-xs font-bold text-neutral-500 uppercase tracking-widest">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 flex-1 grid-rows-[repeat(6,minmax(0,1fr))]">
              {calendarDays.map((day, i) => {
                const dayEvents = events.filter(e => isSameDay(e.date, day));
                return (
                  <div 
                    key={i}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "flex flex-col p-2 border-r border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer relative min-h-0",
                      !isSameMonth(day, monthStart) && "opacity-20",
                      isSameDay(day, new Date()) && "bg-indigo-600/5",
                      isSameDay(day, selectedDate) && "ring-1 ring-inset ring-indigo-500"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1 shrink-0">
                      <span className={cn(
                        "w-6 h-6 flex items-center justify-center rounded-full text-sm font-medium",
                        isSameDay(day, new Date()) ? "bg-indigo-600 text-white" : "text-neutral-400"
                      )}>
                        {format(day, 'd')}
                      </span>
                    </div>
                    <div className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
                      {dayEvents.map((event) => (
                        <div
                          key={event.id}
                          className={cn("px-2 py-0.5 rounded text-[10px] font-bold text-white truncate", event.color)}
                        >
                          {event.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {view === 'Week' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
            {!isWeekTimeline ? (
              <div className="grid grid-cols-7 flex-1">
                {weekDays.map((day) => {
                  const dayEvents = events.filter(e => isSameDay(e.date, day)).sort((a,b) => a.date.getTime() - b.date.getTime());
                  return (
                    <div key={day.toISOString()} className={cn("border-r border-white/5 last:border-r-0 flex flex-col", isSameDay(day, selectedDate) && "bg-white/[0.02]")}>
                      <div onClick={() => setSelectedDate(day)} className={cn("py-4 text-center cursor-pointer hover:bg-white/5 transition-colors border-b border-white/10", isSameDay(day, selectedDate) && "bg-indigo-500/10")}>
                        <div className="text-xs font-bold text-neutral-500 uppercase tracking-widest capitalize">{format(day, 'EEE', { locale: tr })}</div>
                        <div className={cn("text-xl font-display font-bold mt-1", isSameDay(day, new Date()) && "text-indigo-400")}>{format(day, 'd')}</div>
                      </div>
                      <div className="flex-1 p-2 overflow-y-auto space-y-2 h-[300px] no-scrollbar">
                        {dayEvents.map(e => (
                          <div key={e.id} className={cn("p-2 rounded-md flex flex-col gap-1 group text-white shadow-sm", e.color)}>
                            <div className="flex justify-between items-start">
                               <h4 className="font-bold text-xs truncate leading-tight">{e.title}</h4>
                               <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button onClick={(ev) => { ev.stopPropagation(); openEditEventModal(e); }} className="text-white/70 hover:text-white transition-opacity p-0.5">
                                   <Edit2 size={12} />
                                 </button>
                                 <button onClick={(ev) => { ev.stopPropagation(); handleDeleteEvent(e.id); }} className="text-white/70 hover:text-white transition-opacity p-0.5">
                                   <Trash2 size={12} />
                                 </button>
                               </div>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-white/80">
                              {e.is_all_day ? (
                                <span>Tüm Gün</span>
                              ) : (
                                <><Clock size={10}/> {format(e.date, 'HH:mm')}{e.endDate ? ` - ${format(e.endDate, 'HH:mm')}` : ''}</>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-white/10 bg-white/5">
                  <div />
                  {weekDays.map((day) => (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "py-3 text-center border-l border-white/5 hover:bg-white/5 transition-colors",
                        isSameDay(day, selectedDate) && "bg-indigo-500/10"
                      )}
                    >
                      <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest capitalize">{format(day, 'EEE', { locale: tr })}</div>
                      <div className={cn("text-base font-display font-bold mt-0.5", isSameDay(day, new Date()) && "text-indigo-400")}>{format(day, 'd')}</div>
                    </button>
                  ))}
                </div>

                <div ref={weekTimelineScrollRef} className="flex-1 overflow-y-auto relative bg-transparent scroll-smooth">
                  <div className="relative min-h-[1440px] pt-4 pb-12">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <div
                        key={i}
                        className="absolute left-0 right-0 flex items-start"
                        style={{ top: `${i * 60 + 16}px`, height: '60px' }}
                      >
                        <div className="w-14 text-center pr-2 text-[11px] text-neutral-500 font-medium -mt-2">
                          {`${i.toString().padStart(2, '0')}:00`}
                        </div>
                        <div className="flex-1 border-t border-white/5 h-full" />
                      </div>
                    ))}

                    <div className="absolute left-14 right-0 top-0 bottom-0 grid grid-cols-7 pointer-events-none">
                      {weekDays.map((day) => {
                        const dayTimed = events
                          .filter(e => isSameDay(e.date, day) && !e.is_all_day)
                          .map(e => {
                            const startMin = e.date.getHours() * 60 + e.date.getMinutes();
                            let endMin = startMin + 50;
                            if (e.endDate) {
                              const durationMin = Math.round((e.endDate.getTime() - e.date.getTime()) / 60000);
                              if (durationMin > 0) endMin = startMin + durationMin;
                            }
                            return {
                              ...e,
                              top: Math.max(0, Math.min(startMin, 1439)),
                              bottom: Math.max(startMin + 1, Math.min(endMin, 1440)),
                            };
                          })
                          .sort((a, b) => a.top - b.top);

                        const processed: typeof dayTimed = [];
                        let cluster: typeof dayTimed = [];
                        let clusterEnd = 0;

                        const pack = (items: typeof dayTimed) => {
                          const columns: typeof dayTimed[] = [];
                          items.forEach(ev => {
                            let placed = false;
                            for (let i = 0; i < columns.length; i++) {
                              const col = columns[i];
                              const lastEv = col[col.length - 1];
                              if (lastEv.bottom <= ev.top) {
                                col.push(ev);
                                (ev as any).colIndex = i;
                                placed = true;
                                break;
                              }
                            }
                            if (!placed) {
                              (ev as any).colIndex = columns.length;
                              columns.push([ev]);
                            }
                          });
                          const numCols = columns.length;
                          items.forEach(ev => {
                            (ev as any).widthPct = 100 / numCols;
                            (ev as any).leftPct = (ev as any).colIndex * (100 / numCols);
                          });
                          processed.push(...items);
                        };

                        dayTimed.forEach(e => {
                          if (e.top >= clusterEnd) {
                            if (cluster.length > 0) pack(cluster);
                            cluster = [e];
                            clusterEnd = e.bottom;
                          } else {
                            cluster.push(e);
                            clusterEnd = Math.max(clusterEnd, e.bottom);
                          }
                        });
                        if (cluster.length > 0) pack(cluster);

                        return (
                          <div key={day.toISOString()} className="relative border-l border-white/5">
                            {isSameDay(day, new Date()) && (
                              <div
                                className="absolute left-0 right-0 z-20 pointer-events-none"
                                style={{ top: `${now.getHours() * 60 + now.getMinutes() + 16}px` }}
                              >
                                <div className="h-[2px] w-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.45)]" />
                              </div>
                            )}
                            {processed.map(e => (
                              <div
                                key={e.id}
                                className={cn("absolute p-1.5 rounded-md shadow-lg flex flex-col group text-white border border-white/10 backdrop-blur-sm bg-opacity-90 transition-all hover:bg-opacity-100 hover:z-20 pointer-events-auto", e.color)}
                                style={{
                                  top: `${e.top + 16}px`,
                                  height: `${Math.max(e.bottom - e.top, 26)}px`,
                                  minHeight: '26px',
                                  zIndex: 10,
                                  left: `${(e as any).leftPct}%`,
                                  width: `calc(${(e as any).widthPct}% - 3px)`
                                }}
                              >
                                <div className="flex justify-between items-start gap-1">
                                  <h4 className="font-bold text-[11px] leading-tight truncate">{e.title}</h4>
                                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(ev) => { ev.stopPropagation(); openEditEventModal(e); }} className="text-white/70 hover:text-white transition-opacity p-0.5">
                                      <Edit2 size={10} />
                                    </button>
                                    <button onClick={(ev) => { ev.stopPropagation(); handleDeleteEvent(e.id); }} className="text-white/70 hover:text-white transition-opacity p-0.5">
                                      <Trash2 size={10} />
                                    </button>
                                  </div>
                                </div>
                                <div className="text-[10px] text-white/80 mt-auto">
                                  {format(e.date, 'HH:mm')}{e.endDate ? ` - ${format(e.endDate, 'HH:mm')}` : ''}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'Day' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center z-10">
               <h3 className="text-2xl font-bold font-display capitalize">{format(selectedDate, 'EEEE, d MMMM', { locale: tr })}</h3>
            </div>
            
            {/* All day events area */}
            {(() => {
              const allDayEvents = events.filter(e => isSameDay(e.date, selectedDate) && e.is_all_day);
              if (allDayEvents.length > 0) {
                return (
                  <div className="border-b border-white/10 bg-white/5 p-2 pl-14 pr-4 space-y-1 z-10 shadow-sm relative">
                    {allDayEvents.map(e => (
                      <div key={e.id} className={cn("px-3 py-1.5 rounded-md text-xs font-bold text-white shadow-sm flex justify-between items-center group", e.color)}>
                        <span>{e.title}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(ev) => { ev.stopPropagation(); openEditEventModal(e); }} className="text-white/70 hover:text-white transition-opacity">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={(ev) => { ev.stopPropagation(); handleDeleteEvent(e.id); }} className="text-white/70 hover:text-white transition-opacity">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }
              return null;
            })()}

            <div className="flex-1 overflow-y-auto relative bg-transparent scroll-smooth">
              <div className="relative min-h-[1440px] pt-4 pb-12" ref={(el) => {
                // Auto-scroll to current time on mount if it's today
                if (el && isSameDay(selectedDate, new Date()) && !el.dataset.scrolled) {
                  const currentHour = new Date().getHours();
                  el.parentElement?.scrollTo({ top: Math.max(0, currentHour * 60 - 100), behavior: 'smooth' });
                  el.dataset.scrolled = 'true';
                }
              }}>
                {Array.from({ length: 24 }).map((_, i) => (
                  <div 
                    key={i} 
                    className="absolute w-full flex items-start cursor-pointer group hover:bg-white/5 transition-colors z-0" 
                    style={{ top: `${i * 60 + 16}px`, height: '60px' }}
                    onClick={() => {
                      openCreateEventModal(selectedDate);
                      setNewEventTime(`${i.toString().padStart(2, '0')}:00`);
                      setNewEventIsAllDay(false);
                    }}
                  >
                    <div className="w-14 text-center pr-2 text-[11px] text-neutral-500 font-medium -mt-2 bg-transparent relative z-10 group-hover:text-indigo-400 transition-colors">
                      {`${i.toString().padStart(2, '0')}:00`}
                    </div>
                    <div className="flex-1 border-t border-white/5 h-full group-hover:border-indigo-500/30 transition-colors" />
                  </div>
                ))}

                {/* Current time indicator */}
                {isSameDay(selectedDate, new Date()) && (() => {
                  const minutes = now.getHours() * 60 + now.getMinutes();
                  const topPx = minutes + 16; // 16px is the pt-4 offset
                  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                  return (
                    <div
                      ref={timeIndicatorRef}
                      className="absolute left-0 right-0 z-30 pointer-events-none"
                      style={{ top: `${topPx}px` }}
                    >
                      {/* Time label - overlays the hour label column */}
                      <div className="absolute left-0 -top-[9px] w-14 text-center z-10">
                        <span className="text-[11px] font-bold text-rose-500 bg-[var(--bg-primary,#0d0d11)] px-1.5 py-0.5 rounded-md">
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

                {/* Events overlay */}
                <div className="absolute left-14 right-4 top-0 bottom-0 pointer-events-none">
                  {(() => {
                    const dayEvents = events
                      .filter(e => isSameDay(e.date, selectedDate) && !e.is_all_day)
                      .map(e => {
                        const hours = e.date.getHours();
                        const minutes = e.date.getMinutes();
                        const startMin = hours * 60 + minutes;
                        let endMin = startMin + 50; // default ~50dk görünüm
                        if (e.endDate) {
                          const durationMin = Math.round((e.endDate.getTime() - e.date.getTime()) / 60000);
                          if (durationMin > 0) {
                            endMin = startMin + durationMin;
                          }
                        }
                        return {
                          ...e,
                          top: Math.max(0, Math.min(startMin, 1439)),
                          bottom: Math.max(startMin + 1, Math.min(endMin, 1440))
                        };
                      })
                      .sort((a, b) => a.top - b.top);

                    const processedEvents: typeof dayEvents = [];
                    let currentCluster: typeof dayEvents = [];
                    let clusterEnd = 0;

                    const packCluster = (cluster: typeof dayEvents) => {
                      const columns: typeof dayEvents[] = [];
                      cluster.forEach(ev => {
                        let placed = false;
                        for (let i = 0; i < columns.length; i++) {
                          const col = columns[i];
                          const lastEv = col[col.length - 1];
                          if (lastEv.bottom <= ev.top) {
                            col.push(ev);
                            (ev as any).colIndex = i;
                            placed = true;
                            break;
                          }
                        }
                        if (!placed) {
                          (ev as any).colIndex = columns.length;
                          columns.push([ev]);
                        }
                      });
                      const numCols = columns.length;
                      cluster.forEach(ev => {
                        (ev as any).widthPct = 100 / numCols;
                        (ev as any).leftPct = (ev as any).colIndex * (100 / numCols);
                      });
                      processedEvents.push(...cluster);
                    };

                    dayEvents.forEach(e => {
                      if (e.top >= clusterEnd) {
                        if (currentCluster.length > 0) packCluster(currentCluster);
                        currentCluster = [e];
                        clusterEnd = e.bottom;
                      } else {
                        currentCluster.push(e);
                        clusterEnd = Math.max(clusterEnd, e.bottom);
                      }
                    });
                    if (currentCluster.length > 0) packCluster(currentCluster);

                    return processedEvents.map(e => (
                      <div 
                        key={e.id} 
                        className={cn("absolute p-2 rounded-lg shadow-lg flex flex-col group text-white border border-white/10 backdrop-blur-sm bg-opacity-90 transition-all hover:bg-opacity-100 hover:z-20 pointer-events-auto", e.color)}
                        style={{ 
                          top: `${e.top + 16}px`, 
                          height: `${Math.max(e.bottom - e.top, 30)}px`,
                          minHeight: '30px', 
                          zIndex: 10,
                          left: `${(e as any).leftPct}%`,
                          width: `calc(${(e as any).widthPct}% - 4px)`
                        }}
                      >
                        <div className="flex justify-between items-start">
                           <h4 className="font-bold text-sm leading-tight truncate">{e.title}</h4>
                           <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={(ev) => { ev.stopPropagation(); openEditEventModal(e); }} className="text-white/70 hover:text-white transition-opacity p-0.5 flex-shrink-0">
                               <Edit2 size={14} />
                             </button>
                             <button onClick={(ev) => { ev.stopPropagation(); handleDeleteEvent(e.id); }} className="text-white/70 hover:text-white transition-opacity p-0.5 flex-shrink-0">
                               <Trash2 size={14} />
                             </button>
                           </div>
                        </div>
                        <div className="text-[11px] font-medium text-white/80 mt-auto pt-1">
                          {format(e.date, 'HH:mm')}{e.endDate ? ` - ${format(e.endDate, 'HH:mm')}` : ''}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'Agenda' && (
          <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => setAgendaFilter('upcoming')}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                  agendaFilter === 'upcoming' ? "bg-indigo-600 text-white" : "bg-white/5 text-neutral-400 hover:text-white"
                )}
              >
                {t('Cal_UpcomingTitle')}
              </button>
              <button
                onClick={() => setAgendaFilter('past')}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                  agendaFilter === 'past' ? "bg-indigo-600 text-white" : "bg-white/5 text-neutral-400 hover:text-white"
                )}
              >
                {getLang() === 'en' ? 'Past Events' : 'Geçmiş Etkinlikler'}
              </button>
            </div>
            {(() => {
              const today = new Date(new Date().setHours(0,0,0,0));
              const filtered = agendaFilter === 'upcoming'
                ? events.filter(e => e.date >= today).sort((a,b) => a.date.getTime() - b.date.getTime())
                : events.filter(e => e.date < today).sort((a,b) => b.date.getTime() - a.date.getTime());
              return filtered.length > 0 ? filtered.map(e => (
                <div key={e.id} className="p-4 rounded-xl bg-white/5 border border-white/5 flex gap-4 items-center group">
                  <div className="min-w-[60px] text-center">
                    <div className="text-xs text-indigo-400 uppercase font-bold">{format(e.date, 'MMM', { locale: tr })}</div>
                    <div className="text-2xl font-bold">{format(e.date, 'dd')}</div>
                  </div>
                  <div className="w-px h-10 bg-white/10" />
                  <div className="flex-1">
                    <h4 className="font-bold text-lg">{e.title}</h4>
                    <p className="text-xs text-neutral-500">{format(e.date, 'HH:mm')}{e.endDate ? ` - ${format(e.endDate, 'HH:mm')}` : ''} · {format(e.date, 'EEEE', { locale: tr })}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditEventModal(e)} className="text-neutral-500 hover:text-indigo-400 transition-opacity p-2">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDeleteEvent(e.id)} className="text-neutral-500 hover:text-rose-500 transition-opacity p-2">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              )) : (
                <div className="text-neutral-500 py-4">
                  {agendaFilter === 'upcoming' ? t('Cal_NoUpcoming') : (getLang() === 'en' ? 'No past events.' : 'Geçmiş etkinlik bulunamadı.')}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Selected Day Agenda (Floating Mini) */}
      {view === 'Month' && events.filter(e => isSameDay(e.date, selectedDate)).length > 0 && (
        <div className="absolute bottom-8 right-8 z-30 flex flex-col items-end">
          {isAgendaMinimized ? (
            <button 
              onClick={() => setIsAgendaMinimized(false)}
              className="glass-panel bg-indigo-600/20 px-4 py-2.5 rounded-full border border-indigo-500/30 shadow-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-600/30 transition-colors backdrop-blur-md"
            >
              <Clock size={16} className="text-indigo-400" />
              <span>{events.filter(e => isSameDay(e.date, selectedDate)).length} Etkinlik</span>
            </button>
          ) : (
            <div className="w-80 max-h-72 glass-panel rounded-3xl border border-white/10 p-4 shadow-2xl flex flex-col backdrop-blur-xl bg-black/40">
              <div className="flex justify-between items-center mb-3 px-1">
                 <div className="flex flex-col">
                   <h4 className="font-bold text-sm capitalize">{format(selectedDate, 'd MMMM EEEE', { locale: tr })}</h4>
                   <span className="text-[10px] uppercase tracking-wider font-bold text-white/50">{events.filter(e => isSameDay(e.date, selectedDate)).length} Etkinlik</span>
                 </div>
                 <button 
                   onClick={() => setIsAgendaMinimized(true)}
                   className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/50 hover:text-white"
                 >
                   <ChevronRight size={16} className="rotate-90" />
                 </button>
              </div>
              <div className="overflow-y-auto flex-1 space-y-2 no-scrollbar">
                {events.filter(e => isSameDay(e.date, selectedDate)).map(e => (
                  <div key={e.id} className={cn("p-3 rounded-2xl flex flex-col gap-1 text-white shadow-sm border border-white/5", e.color)}>
                    <div className="flex justify-between items-start">
                       <h4 className="font-bold text-sm leading-tight">{e.title}</h4>
                       <div className="flex items-center gap-1">
                         <button
                           onClick={() => openEditEventModal(e)}
                           className="text-white/70 hover:text-white transition-opacity p-1"
                           title="Düzenle"
                         >
                           <Edit2 size={13} />
                         </button>
                         <button
                           onClick={() => handleDeleteEvent(e.id)}
                           className="text-white/70 hover:text-white transition-opacity p-1"
                           title="Sil"
                         >
                           <Trash2 size={13} />
                         </button>
                       </div>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-white/80 font-medium mt-1">
                      {e.is_all_day ? (
                        <><Clock size={12} /> Tüm Gün</>
                      ) : (
                        <><Clock size={12} /> {format(e.date, 'HH:mm')}{e.endDate ? ` - ${format(e.endDate, 'HH:mm')}` : ''}</>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm glass-panel p-6 rounded-3xl border border-white/10 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">{editingEventId ? 'Etkinlik Düzenle' : 'Etkinlik Ekle'}</h3>
            <form onSubmit={handleSaveEvent} className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Başlık</label>
                <input 
                  autoFocus 
                  type="text" 
                  placeholder="Etkinlik Başlığı" 
                  value={newEventTitle}
                  onChange={e => setNewEventTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-3">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm text-neutral-400 mb-1">Tarih</label>
                    <input 
                      type="text" 
                      disabled
                      value={format(selectedDate, 'dd.MM.yyyy', { locale: tr })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none text-neutral-400 cursor-not-allowed"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-6">
                    <input
                      type="checkbox"
                      id="all-day-checkbox"
                      checked={newEventIsAllDay}
                      onChange={e => { setNewEventIsAllDay(e.target.checked); if (e.target.checked) setNewEventEndTime(''); }}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="all-day-checkbox" className="text-sm font-medium text-neutral-300 select-none cursor-pointer">
                      Tüm Gün
                    </label>
                  </div>
                </div>
                {!newEventIsAllDay && (
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="block text-sm text-neutral-400 mb-1">Başlangıç</label>
                      <input 
                        type="time" 
                        value={newEventTime}
                        onChange={e => setNewEventTime(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 [color-scheme:dark]"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm text-neutral-400 mb-1">Bitiş <span className="text-neutral-600">(opsiyonel)</span></label>
                      <input 
                        type="time" 
                        value={newEventEndTime}
                        onChange={e => setNewEventEndTime(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 [color-scheme:dark]"
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setIsAdding(false); setEditingEventId(null); }} className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">İptal</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-colors">
                  {editingEventId ? 'Güncelle' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
