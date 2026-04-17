import React, { useState } from 'react';
import { 
  ChevronLeft, ChevronRight, Plus, 
  MoreHorizontal, Clock, MapPin, Users, Trash2 
} from 'lucide-react';
import { 
  format, addMonths, subMonths, startOfMonth, 
  endOfMonth, startOfWeek, endOfWeek, isSameMonth, 
  isSameDay, addDays, eachDayOfInterval 
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
  const [newEventTitle, setNewEventTitle] = useState('');
  const [tasks, setTasks] = useState<any[]>([]);
  const [newEventDate, setNewEventDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newEventTime, setNewEventTime] = useState('09:00');
  const [agendaFilter, setAgendaFilter] = useState<'upcoming' | 'past'>('upcoming');

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

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn });
  const endDate = endOfWeek(monthEnd, { weekStartsOn });

  let calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  // Always render 6 rows (42 cells)
  while (calendarDays.length < 42) {
    calendarDays.push(addDays(calendarDays[calendarDays.length - 1], 1));
  }

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const events = tasks.map(task => ({
    id: task.id,
    title: task.title,
    date: new Date(task.due_date),
    color: task.priority === 'Critical' ? 'bg-rose-500' : task.priority === 'High' ? 'bg-amber-500' : 'bg-indigo-500'
  }));

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle || !newEventTime) return;
    
    // Use selectedDate - format it to YYYY-MM-DD and combine with time
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    const dateObj = new Date(`${selectedDateStr}T${newEventTime}`);

    try {
      await api.createTask({
        id: crypto.randomUUID(),
        title: newEventTitle,
        due_date: dateObj.toISOString(),
        priority: 'Medium',
        status: 'Todo'
      });
      setNewEventTitle('');
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
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-display font-bold capitalize">{format(currentDate, 'MMMM yyyy', { locale: tr })}</h2>
          <div className="flex items-center bg-white/5 rounded-lg border border-white/10 p-1">
            <button onClick={prevMonth} className="p-1.5 hover:bg-white/10 rounded-md transition-colors">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()); }} className="px-3 py-1 text-sm font-medium hover:bg-white/10 rounded-md transition-colors">
              {t('Cal_Today')}
            </button>
            <button onClick={nextMonth} className="p-1.5 hover:bg-white/10 rounded-md transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
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
          <button onClick={() => { setIsAdding(true); setNewEventDate(format(selectedDate, 'yyyy-MM-dd')); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-lg shadow-indigo-500/20 transition-all">
            <Plus size={18} />
            <span>{t('Cal_NewEvent')}</span>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="glass-panel rounded-3xl border border-white/5 overflow-visible flex flex-col">
        {view === 'Month' && (
          <>
            <div className="grid grid-cols-7 border-b border-white/10 bg-white/5">
              {(weekStartsOn === 1 ? ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'] : ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']).map((day) => (
                <div key={day} className="py-4 text-center text-xs font-bold text-neutral-500 uppercase tracking-widest">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarDays.map((day, i) => {
                const dayEvents = events.filter(e => isSameDay(e.date, day));
                return (
                  <div 
                    key={i}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "min-h-[80px] p-2 border-r border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer relative",
                      !isSameMonth(day, monthStart) && "opacity-20",
                      isSameDay(day, new Date()) && "bg-indigo-600/5",
                      isSameDay(day, selectedDate) && "ring-1 ring-inset ring-indigo-500"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn(
                        "w-6 h-6 flex items-center justify-center rounded-full text-sm font-medium",
                        isSameDay(day, new Date()) ? "bg-indigo-600 text-white" : "text-neutral-400"
                      )}>
                        {format(day, 'd')}
                      </span>
                    </div>
                    <div className="space-y-1 overflow-y-auto max-h-[80px] no-scrollbar">
                      {dayEvents.map((event) => (
                        <div key={event.id} className={cn("px-2 py-0.5 rounded text-[10px] font-bold text-white truncate", event.color)}>
                          {event.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        
        {view === 'Week' && (
          <div className="flex-1 flex flex-col">
            <div className="grid grid-cols-7 border-b border-white/10 bg-white/5">
              {eachDayOfInterval({ start: startOfWeek(selectedDate, { weekStartsOn }), end: endOfWeek(selectedDate, { weekStartsOn }) }).map((day) => (
                <div key={day.toISOString()} onClick={() => setSelectedDate(day)} className={cn("py-4 text-center cursor-pointer hover:bg-white/5 transition-colors", isSameDay(day, selectedDate) && "bg-indigo-500/10")}>
                  <div className="text-xs font-bold text-neutral-500 uppercase tracking-widest capitalize">{format(day, 'EEE', { locale: tr })}</div>
                  <div className={cn("text-xl font-display font-bold mt-1", isSameDay(day, new Date()) && "text-indigo-400")}>{format(day, 'd')}</div>
                </div>
              ))}
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-2">
              {events.filter(e => isSameDay(e.date, selectedDate)).length > 0 ? events.filter(e => isSameDay(e.date, selectedDate)).map(e => (
                <div key={e.id} className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between group">
                  <div>
                    <h4 className="font-bold">{e.title}</h4>
                    <div className="flex gap-4 text-xs text-neutral-500">
                      <span className="flex items-center gap-1"><Clock size={12}/> {format(e.date, 'HH:mm')}</span>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteEvent(e.id)} className="text-neutral-500 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-2">
                    <Trash2 size={18} />
                  </button>
                </div>
              )) : <div className="text-center text-neutral-500 py-10">{t('Cal_NoDayEvents')}</div>}
            </div>
          </div>
        )}

        {view === 'Day' && (
          <div className="flex-1 flex flex-col p-6 overflow-y-auto">
            <h3 className="text-2xl font-bold font-display mb-6 capitalize">{format(selectedDate, 'EEEE, d MMMM', { locale: tr })}</h3>
            <div className="space-y-4">
              {events.filter(e => isSameDay(e.date, selectedDate)).length > 0 ? events.filter(e => isSameDay(e.date, selectedDate)).map(e => (
                <div key={e.id} className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between group">
                  <div>
                    <h4 className="font-bold text-lg">{e.title}</h4>
                    <p className="text-xs text-neutral-500">{format(e.date, 'HH:mm')}</p>
                  </div>
                  <button onClick={() => handleDeleteEvent(e.id)} className="text-neutral-500 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-2">
                    <Trash2 size={18} />
                  </button>
                </div>
              )) : <div className="text-center text-neutral-500 py-10">{t('Cal_NoDayPlanned')}</div>}
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
                    <p className="text-xs text-neutral-500">{format(e.date, 'HH:mm')} - {format(e.date, 'EEEE', { locale: tr })}</p>
                  </div>
                  <button onClick={() => handleDeleteEvent(e.id)} className="text-neutral-500 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-2">
                    <Trash2 size={18} />
                  </button>
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

      {/* Selected Day Agenda (Mini) */}
      {view === 'Month' && (
        <div className="h-48 glass-panel rounded-3xl border border-white/5 p-6 flex items-center gap-8">
          <div className="text-center min-w-[100px]">
            <p className="text-indigo-400 font-bold uppercase tracking-widest text-xs mb-1 capitalize">{format(selectedDate, 'EEE', { locale: tr })}</p>
            <p className="text-5xl font-display font-black">{format(selectedDate, 'd')}</p>
          </div>
          <div className="h-full w-px bg-white/10" />
          <div className="flex-1 overflow-x-auto flex gap-4">
            {events.filter(e => isSameDay(e.date, selectedDate)).length > 0 ? (
              events.filter(e => isSameDay(e.date, selectedDate)).map(e => (
                <div key={e.id} className="min-w-[250px] p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
                  <h4 className="font-bold">{e.title}</h4>
                  <div className="flex items-center gap-3 text-xs text-neutral-500">
                    <div className="flex items-center gap-1"><Clock size={12} /> Tüm Gün</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center w-full text-neutral-500 italic">
                {t('Cal_NoEvents')}
              </div>
            )}
          </div>
        </div>
      )}

      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm glass-panel p-6 rounded-3xl border border-white/10 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Etkinlik Ekle</h3>
            <form onSubmit={handleAddEvent} className="space-y-4">
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
                <div className="flex-1">
                  <label className="block text-sm text-neutral-400 mb-1">Saat</label>
                  <input 
                    type="time" 
                    value={newEventTime}
                    onChange={e => setNewEventTime(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 [color-scheme:dark]"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">İptal</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-colors">Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
