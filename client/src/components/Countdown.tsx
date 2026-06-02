import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, PartyPopper, RotateCcw, Pencil, X, List, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '../lib/utils';
import { getLang, t } from '../lib/i18n';
import { ModernDateField, ModernTimeField, parseDateIso } from './ModernDateTimeFields';

const STORAGE_KEY = 'nexus-date-countdowns';

const RING_SIZE = 360;
const RING_CENTER = RING_SIZE / 2;
const RING_RADIUS = 156;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export interface DateCountdown {
  id: string;
  label: string;
  date: string;
  time: string;
  createdAt: number;
}

interface TimeRemaining {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function parseTargetLocal(c: Pick<DateCountdown, 'date' | 'time'>): Date | null {
  const base = parseDateIso(c.date);
  if (!base) return null;
  const match = c.time.match(/^(\d{1,2}):(\d{1,2})$/);
  const h = match ? Math.min(23, parseInt(match[1], 10) || 0) : 0;
  const min = match ? Math.min(59, parseInt(match[2], 10) || 0) : 0;
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, min, 0, 0);
}

function isValidCountdownEntry(c: Pick<DateCountdown, 'date' | 'time'>): boolean {
  return parseTargetLocal(c) !== null;
}

function getRemaining(target: Date | null, now: Date): TimeRemaining {
  if (!target || Number.isNaN(target.getTime())) {
    return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  const totalMs = target.getTime() - now.getTime();
  if (totalMs <= 0) {
    return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  const seconds = Math.floor(totalMs / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return { totalMs, days, hours, minutes, seconds: secs, expired: false };
}

function defaultDateString() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function loadCountdowns(): DateCountdown[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DateCountdown[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((c) => c?.id && c?.label && isValidCountdownEntry(c))
      .map((c) => ({
        ...c,
        createdAt: c.createdAt ?? Date.now(),
      }));
  } catch {
    return [];
  }
}

function formatMainDisplay(rem: TimeRemaining) {
  if (rem.days > 0) return `${rem.days}`;
  return `${pad(rem.hours)}:${pad(rem.minutes)}:${pad(rem.seconds)}`;
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-0 flex flex-col items-center">
      <div className="w-full rounded-xl border border-white/10 bg-white/5 py-2 sm:py-2.5 flex items-center justify-center">
        <span className="text-xl sm:text-2xl font-mono font-black tabular-nums tracking-tighter text-white">
          {pad(value)}
        </span>
      </div>
      <span className="text-[10px] sm:text-xs font-bold text-neutral-500 uppercase tracking-widest mt-1.5 truncate max-w-full px-0.5">
        {label}
      </span>
    </div>
  );
}

const inputClass =
  'w-full min-w-0 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors text-white [color-scheme:dark]';

const labelClass = 'block text-sm font-medium text-neutral-400 mb-2.5';

function ActiveCountdownMenu({
  countdowns,
  selectedId,
  now,
  open,
  onToggle,
  onClose,
  onSelect,
  onEdit,
  onDelete,
}: {
  countdowns: DateCountdown[];
  selectedId: string | null;
  now: Date;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSelect: (id: string) => void;
  onEdit: (c: DateCountdown) => void;
  onDelete: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  if (countdowns.length === 0) return null;

  return (
    <div ref={ref} className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-30">
      <button
        type="button"
        onClick={onToggle}
        title={t('Countdown_List')}
        className={cn(
          'group flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-lg border transition-all duration-200',
          'text-neutral-500 hover:text-neutral-300',
          open
            ? 'bg-white/[0.07] border-white/15 text-neutral-300'
            : 'bg-transparent border-transparent hover:bg-white/[0.04] hover:border-white/10 opacity-75 hover:opacity-100'
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t('Countdown_List')}
      >
        <List size={16} className="shrink-0 opacity-80" />
        <span className="text-xs font-medium tabular-nums text-neutral-500 group-hover:text-neutral-400">
          {countdowns.length}
        </span>
        <ChevronDown
          size={14}
          className={cn('shrink-0 opacity-50 transition-transform duration-200', open && 'rotate-180 opacity-70')}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-[min(100vw-2rem,18rem)] rounded-2xl glass-panel border border-white/10 shadow-2xl backdrop-blur-xl overflow-hidden"
            role="listbox"
          >
            <div className="px-4 py-3 border-b border-white/10">
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                {t('Countdown_List')}
              </p>
            </div>
            <ul className="max-h-64 overflow-y-auto overscroll-contain p-2 space-y-1.5 custom-scrollbar">
              {countdowns.map((c) => {
                const rem = getRemaining(parseTargetLocal(c), now);
                const isActive = c.id === selectedId;
                return (
                  <li key={c.id} role="option" aria-selected={isActive}>
                    <div
                      className={cn(
                        'flex items-center gap-1 rounded-xl border transition-all',
                        isActive
                          ? 'bg-indigo-600/15 border-indigo-500/35'
                          : 'bg-white/5 border-white/10 hover:bg-white/[0.08]'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => onSelect(c.id)}
                        className="flex-1 min-w-0 text-left px-3 py-3"
                      >
                        <p className={cn('font-display font-bold text-sm truncate', isActive ? 'text-indigo-300' : 'text-white')}>
                          {c.label}
                        </p>
                        <p className="text-xs text-neutral-500 truncate mt-0.5">{c.date} · {c.time}</p>
                        <p className="font-mono font-bold text-xs tabular-nums text-neutral-400 mt-1">
                          {rem.expired
                            ? t('Countdown_Done')
                            : `${rem.days}g ${pad(rem.hours)}:${pad(rem.minutes)}:${pad(rem.seconds)}`}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(c)}
                        className="p-2 mr-0.5 rounded-lg text-neutral-500 hover:bg-indigo-500/10 hover:text-indigo-300"
                        aria-label={t('Countdown_Edit')}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(c.id)}
                        className="p-2 mr-1 rounded-lg text-neutral-500 hover:bg-red-500/10 hover:text-red-400"
                        aria-label={t('Btn_Delete')}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Countdown() {
  const [countdowns, setCountdowns] = useState<DateCountdown[]>(loadCountdowns);
  const [now, setNow] = useState(() => new Date());
  const [selectedId, setSelectedId] = useState<string | null>(() => loadCountdowns()[0]?.id ?? null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [date, setDate] = useState(defaultDateString);
  const [time, setTime] = useState('12:00');
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(() => new Set());
  const [listMenuOpen, setListMenuOpen] = useState(false);

  const isEditing = editingId !== null;

  const locale = getLang() === 'en' ? 'en-US' : 'tr-TR';

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(countdowns));
  }, [countdowns]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const selected = countdowns.find((c) => c.id === selectedId) ?? countdowns[0] ?? null;

  const remaining = useMemo(() => {
    if (!selected) return null;
    return getRemaining(parseTargetLocal(selected), now);
  }, [selected, now]);

  const targetFormatted = useMemo(() => {
    if (!selected) return '';
    const target = parseTargetLocal(selected);
    if (!target) return '';
    return new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(target);
  }, [selected, locale]);

  const progressPercent = useMemo(() => {
    if (!selected || !remaining || remaining.expired) return 100;
    const target = parseTargetLocal(selected);
    if (!target) return 0;
    const span = target.getTime() - selected.createdAt;
    if (span <= 0) return 0;
    return Math.min(100, Math.max(0, ((now.getTime() - selected.createdAt) / span) * 100));
  }, [selected, remaining, now]);

  const handleExpired = useCallback((c: DateCountdown) => {
    if (notifiedIds.has(c.id)) return;
    setNotifiedIds((prev) => new Set(prev).add(c.id));
    toast.success(
      c.label ? `${c.label} — ${t('Countdown_Reached')}` : t('Countdown_Reached'),
      { duration: 8000 }
    );
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(t('Nav_Countdown'), {
        body: c.label || t('Countdown_Reached'),
      });
    }
  }, [notifiedIds]);

  useEffect(() => {
    if (!selected || !remaining?.expired) return;
    handleExpired(selected);
  }, [selected, remaining?.expired, handleExpired]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const validateForm = () => {
    const title = label.trim();
    if (!title) {
      toast.error(t('Countdown_LabelRequired'));
      return null;
    }
    const target = parseTargetLocal({ date, time });
    if (!target) {
      toast.error(t('Countdown_InvalidDate'));
      return null;
    }
    if (target.getTime() <= Date.now()) {
      toast.error(t('Countdown_PastError'));
      return null;
    }
    return { title, target };
  };

  const addCountdown = () => {
    const valid = validateForm();
    if (!valid) return;

    const entry: DateCountdown = {
      id: uuidv4(),
      label: valid.title,
      date,
      time,
      createdAt: Date.now(),
    };
    setCountdowns((prev) => [...prev, entry]);
    setSelectedId(entry.id);
    resetForm();
    setNotifiedIds((prev) => {
      const next = new Set(prev);
      next.delete(entry.id);
      return next;
    });
    toast.success(t('Countdown_Added'));
  };

  const startEdit = (c: DateCountdown) => {
    setEditingId(c.id);
    setSelectedId(c.id);
    setLabel(c.label);
    setDate(c.date);
    setTime(c.time);
  };

  const cancelEdit = () => {
    setEditingId(null);
    resetForm();
  };

  const saveEdit = () => {
    if (!editingId) return;
    const valid = validateForm();
    if (!valid) return;

    const existing = countdowns.find((c) => c.id === editingId);
    const targetChanged =
      existing && (existing.date !== date || existing.time !== time);

    setCountdowns((prev) =>
      prev.map((c) =>
        c.id === editingId
          ? {
              ...c,
              label: valid.title,
              date,
              time,
              createdAt: targetChanged ? Date.now() : c.createdAt,
            }
          : c
      )
    );
    setNotifiedIds((prev) => {
      const next = new Set(prev);
      next.delete(editingId);
      return next;
    });
    setEditingId(null);
    resetForm();
    toast.success(t('Countdown_Saved'));
  };

  const removeCountdown = (id: string) => {
    setCountdowns((prev) => prev.filter((c) => c.id !== id));
    if (selectedId === id) {
      const rest = countdowns.filter((c) => c.id !== id);
      setSelectedId(rest[0]?.id ?? null);
    }
    setNotifiedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setLabel('');
    setDate(defaultDateString());
    setTime('12:00');
  };

  return (
    <div className="h-[calc(100dvh-6.5rem)] sm:h-[calc(100dvh-7rem)] max-h-[calc(100dvh-6.5rem)] sm:max-h-[calc(100dvh-7rem)] min-h-0 w-full flex flex-col gap-3 sm:gap-4 overflow-hidden">
      <header className="shrink-0">
        <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
          {t('Countdown_Title')}
        </h2>
      </header>

      <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-[minmax(0,22rem)_1fr] gap-4 sm:gap-5 overflow-hidden">
        {/* Sol — mobilde üstte, kaydırılabilir; masaüstünde sabit sütun */}
        <aside className="shrink-0 lg:max-h-full min-h-0 flex flex-col overflow-y-auto lg:overflow-visible overscroll-contain pr-0.5">
          <div className="glass-panel rounded-2xl sm:rounded-3xl border border-white/10 p-6 sm:p-7 space-y-5 shrink-0 relative z-20 overflow-visible">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-display font-bold text-white">
                {isEditing ? t('Countdown_EditTitle') : t('Countdown_New')}
              </h3>
              {isEditing && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="p-1.5 rounded-lg text-neutral-500 hover:bg-white/10 hover:text-white transition-colors"
                  title={t('Btn_Cancel')}
                  aria-label={t('Btn_Cancel')}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <div>
              <label className={labelClass}>
                {t('Task_Title')} <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={t('Countdown_LabelPlaceholder')}
                className={inputClass}
                required
              />
            </div>
            <div className="space-y-4 min-w-0 pt-1">
              <div>
                <label className={labelClass}>{t('Cal_DateLabel')}</label>
                <ModernDateField value={date} onChange={setDate} />
              </div>
              <div>
                <label className={labelClass}>{t('Cal_TimeLabel')}</label>
                <ModernTimeField value={time} onChange={setTime} />
              </div>
            </div>
            <div className="flex gap-3 pt-5 mt-1 border-t border-white/10">
              <button
                type="button"
                onClick={isEditing ? saveEdit : addCountdown}
                disabled={!label.trim()}
                className={cn(
                  'flex-1 min-w-0 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold shadow-lg transition-all',
                  label.trim()
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                    : 'bg-white/5 text-neutral-500 cursor-not-allowed shadow-none'
                )}
              >
                {isEditing ? <Pencil size={18} /> : <Plus size={18} />}
                <span className="truncate">
                  {isEditing ? t('Btn_Save') : t('Countdown_Start')}
                </span>
              </button>
              <button
                type="button"
                onClick={isEditing ? cancelEdit : resetForm}
                className="shrink-0 p-3 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/10 transition-all"
                title={isEditing ? t('Btn_Cancel') : t('Btn_Reset')}
                aria-label={isEditing ? t('Btn_Cancel') : t('Btn_Reset')}
              >
                {isEditing ? <X size={18} /> : <RotateCcw size={18} />}
              </button>
            </div>
          </div>
        </aside>

        {/* Sağ — kalan yükseklik */}
        <section className="relative flex-1 min-h-0 min-w-0 glass-panel rounded-2xl sm:rounded-3xl border border-white/10 p-4 sm:p-5 flex flex-col overflow-hidden">
          <ActiveCountdownMenu
            countdowns={countdowns}
            selectedId={selectedId}
            now={now}
            open={listMenuOpen}
            onToggle={() => setListMenuOpen((o) => !o)}
            onClose={() => setListMenuOpen(false)}
            onSelect={(id) => {
              if (editingId && editingId !== id) cancelEdit();
              setSelectedId(id);
              setListMenuOpen(false);
            }}
            onEdit={(c) => {
              startEdit(c);
              setListMenuOpen(false);
            }}
            onDelete={(id) => {
              if (editingId === id) cancelEdit();
              removeCountdown(id);
            }}
          />
          <AnimatePresence mode="wait">
            {!selected ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center text-center text-neutral-500 px-4"
              >
                <p className="font-display font-bold text-neutral-400">{t('Countdown_Empty')}</p>
              </motion.div>
            ) : remaining?.expired ? (
              <motion.div
                key="done"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col items-center justify-center text-center gap-2 px-4 min-h-0"
              >
                <PartyPopper size={48} className="text-amber-400 shrink-0" />
                <h3 className="text-xl font-display font-bold text-white truncate max-w-full">{selected.label}</h3>
                <p className="text-lg text-indigo-400 font-display font-bold">{t('Countdown_Reached')}</p>
                <p className="text-sm text-neutral-400">{targetFormatted}</p>
              </motion.div>
            ) : (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-h-0 flex flex-col items-center overflow-hidden"
              >
                {/* Başlık — sabit yükseklik */}
                <div className="shrink-0 text-center w-full min-w-0 px-8 sm:px-10 pb-2 sm:pb-3 pt-1">
                  <h3 className="text-lg sm:text-xl font-display font-bold text-white truncate">
                    {selected.label}
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-400 truncate mt-0.5">{targetFormatted}</p>
                  <button
                    type="button"
                    onClick={() => startEdit(selected)}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors"
                  >
                    <Pencil size={14} />
                    {t('Countdown_Edit')}
                  </button>
                </div>

                {/* Halka — kalan dikey alanı doldurur, taşmaz */}
                <div className="flex-1 min-h-0 w-full flex items-center justify-center py-1">
                  <div className="relative h-full max-h-full aspect-square max-w-full">
                    <svg
                      viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
                      className="h-full w-full -rotate-90"
                      aria-hidden
                    >
                      <circle
                        cx={RING_CENTER}
                        cy={RING_CENTER}
                        r={RING_RADIUS}
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-white/5"
                      />
                      <motion.circle
                        cx={RING_CENTER}
                        cy={RING_CENTER}
                        r={RING_RADIUS}
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={RING_CIRCUMFERENCE}
                        animate={{
                          strokeDashoffset: RING_CIRCUMFERENCE * (1 - progressPercent / 100),
                        }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="text-indigo-500"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
                      <span
                        className={cn(
                          'font-mono font-black tracking-tighter text-white tabular-nums leading-none',
                          remaining && remaining.days > 0
                            ? 'text-[clamp(2.5rem,10vmin,4.5rem)]'
                            : 'text-[clamp(1.75rem,7vmin,3.5rem)]'
                        )}
                      >
                        {remaining ? formatMainDisplay(remaining) : '00:00:00'}
                      </span>
                      <span className="text-[10px] sm:text-xs font-medium text-neutral-500 uppercase tracking-[0.15em] mt-1">
                        {remaining && remaining.days > 0
                          ? t('Countdown_DaysUnit')
                          : t('Countdown_Remaining')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Birimler — sabit alt şerit */}
                <div className="shrink-0 w-full max-w-md mx-auto grid grid-cols-4 gap-1.5 sm:gap-2 pt-2 sm:pt-3">
                  <CountdownUnit value={remaining?.days ?? 0} label={t('Countdown_Days')} />
                  <CountdownUnit value={remaining?.hours ?? 0} label={t('Countdown_Hours')} />
                  <CountdownUnit value={remaining?.minutes ?? 0} label={t('Countdown_Minutes')} />
                  <CountdownUnit value={remaining?.seconds ?? 0} label={t('Countdown_Seconds')} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}
