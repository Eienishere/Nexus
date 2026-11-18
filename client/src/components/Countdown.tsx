import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Trash2,
  PartyPopper,
  RotateCcw,
  Pencil,
  X,
  ChevronDown,
  Clock,
  Calendar as CalendarIcon,
  Hourglass,
} from 'lucide-react';
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

const labelClass = 'block text-sm font-medium text-neutral-400 mb-2';

export default function Countdown() {
  const [countdowns, setCountdowns] = useState<DateCountdown[]>(loadCountdowns);
  const [now, setNow] = useState(() => new Date());
  const [selectedId, setSelectedId] = useState<string | null>(() => loadCountdowns()[0]?.id ?? null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [date, setDate] = useState(defaultDateString);
  const [time, setTime] = useState('12:00');
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(() => new Set());
  const [isAddOpen, setIsAddOpen] = useState(() => loadCountdowns().length === 0);

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
    setIsAddOpen(false);
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
    setIsAddOpen(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    resetForm();
    setIsAddOpen(false);
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
    setIsAddOpen(false);
    toast.success(t('Countdown_Saved'));
  };

  const removeCountdown = (id: string) => {
    setCountdowns((prev) => {
      const rest = prev.filter((c) => c.id !== id);
      if (selectedId === id) {
        setSelectedId(rest[0]?.id ?? null);
      }
      return rest;
    });
    setNotifiedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (editingId === id) {
      cancelEdit();
    }
    toast.success(t('Btn_Delete'));
  };

  const resetForm = () => {
    setEditingId(null);
    setLabel('');
    setDate(defaultDateString());
    setTime('12:00');
  };

  return (
    <div className="h-[calc(100dvh-6.5rem)] sm:h-[calc(100dvh-7rem)] max-h-[calc(100dvh-6.5rem)] sm:max-h-[calc(100dvh-7rem)] min-h-0 w-full flex flex-col gap-3 sm:gap-4 overflow-hidden">
      {/* Üst Başlık */}
      <header className="shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
            {t('Countdown_Title')}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            {t('Countdown_Subtitle')}
          </p>
        </div>
      </header>

      {/* Ana Izgara: Sol Sütun (Eski Yeni Ekleme Panelinin Yeri: Kapanır Açılır Panel + Odaktaki Kaydedilenler), Sağ Sütun (Büyük Geri Sayım Görünümü) */}
      <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-[22rem_1fr] xl:grid-cols-[24rem_1fr] gap-4 sm:gap-5 overflow-y-auto lg:overflow-hidden">
        {/* Sol Sütun — Eski panelin olduğu yer */}
        <aside className="shrink-0 lg:h-full lg:min-h-0 flex flex-col gap-3 sm:gap-4 overflow-visible">
          {/* 1. Kapanır Açılır Panel: Yeni Geri Sayım Ekleme / Düzenleme */}
          <div className="glass-panel rounded-2xl sm:rounded-3xl border border-white/10 p-3.5 sm:p-4.5 shrink-0 relative z-20 overflow-visible transition-all">
            {/* Panel Başlığı / Açma-Kapama Düğmesi */}
            <button
              type="button"
              onClick={() => {
                if (isEditing) {
                  cancelEdit();
                } else {
                  setIsAddOpen((prev) => !prev);
                }
              }}
              className="w-full flex items-center justify-between gap-3 text-left group cursor-pointer focus:outline-none"
              aria-expanded={isAddOpen || isEditing}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                    isEditing
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      : isAddOpen
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-white/5 text-neutral-400 group-hover:text-white group-hover:bg-white/10 border border-white/10'
                  )}
                >
                  {isEditing ? (
                    <Pencil size={17} />
                  ) : (
                    <Plus
                      size={17}
                      className={cn(
                        'transition-transform duration-200',
                        isAddOpen && 'rotate-45'
                      )}
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-display font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                    {isEditing ? t('Countdown_EditTitle') : t('Countdown_AddNew')}
                  </h3>
                  <p className="text-xs text-neutral-400 truncate">
                    {isEditing
                      ? t('Countdown_Edit')
                      : isAddOpen
                        ? 'Formu kapatmak için tıklayın'
                        : 'Yeni geri sayım eklemek için tıklayın'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 text-neutral-400 group-hover:text-white">
                <ChevronDown
                  size={18}
                  className={cn(
                    'transition-transform duration-200',
                    (isAddOpen || isEditing) && 'rotate-180 text-indigo-400'
                  )}
                />
              </div>
            </button>

            {/* Açılır / Kapanır Form Gövdesi */}
            <AnimatePresence initial={false}>
              {(isAddOpen || isEditing) && (
                <motion.div
                  key="add-panel-body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeInOut' }}
                  className={cn(
                    'overflow-visible',
                    !isAddOpen && !isEditing && 'overflow-hidden'
                  )}
                >
                  <div className="pt-4 pb-1 space-y-3.5 border-t border-white/10 mt-3.5">
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

                    <div className="space-y-3.5 min-w-0">
                      <div>
                        <label className={labelClass}>{t('Cal_DateLabel')}</label>
                        <ModernDateField value={date} onChange={setDate} />
                      </div>
                      <div>
                        <label className={labelClass}>{t('Cal_TimeLabel')}</label>
                        <ModernTimeField value={time} onChange={setTime} />
                      </div>
                    </div>

                    <div className="flex gap-2.5 pt-3 border-t border-white/10">
                      <button
                        type="button"
                        onClick={isEditing ? saveEdit : addCountdown}
                        disabled={!label.trim()}
                        className={cn(
                          'flex-1 min-w-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg transition-all',
                          label.trim()
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                            : 'bg-white/5 text-neutral-500 cursor-not-allowed shadow-none'
                        )}
                      >
                        {isEditing ? <Pencil size={16} /> : <Plus size={16} />}
                        <span className="truncate">
                          {isEditing ? t('Btn_Save') : t('Countdown_Start')}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (isEditing) {
                            cancelEdit();
                          } else {
                            resetForm();
                            setIsAddOpen(false);
                          }
                        }}
                        className="shrink-0 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/10 transition-all text-xs font-semibold"
                        title={t('Btn_Cancel')}
                      >
                        {t('Btn_Cancel')}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 2. Kaydedilenler (Eski panelin yerinde, daha belirgin ve odakta) */}
          <div className="glass-panel rounded-2xl sm:rounded-3xl border border-white/10 flex-1 min-h-[300px] lg:min-h-0 flex flex-col overflow-hidden relative z-10">
            {/* Kaydedilenler Başlığı */}
            <div className="p-3.5 sm:p-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Hourglass size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-display font-bold text-white tracking-tight">
                    {t('Countdown_SavedList')}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    {countdowns.length === 1
                      ? '1 geri sayım'
                      : `${countdowns.length} geri sayım`}
                  </p>
                </div>
              </div>

              {!isAddOpen && !isEditing && (
                <button
                  type="button"
                  onClick={() => setIsAddOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-colors"
                  title={t('Countdown_AddNew')}
                >
                  <Plus size={13} />
                  <span>{t('Countdown_New')}</span>
                </button>
              )}
            </div>

            {/* Kaydedilenler Listesi */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-3.5 space-y-2.5 custom-scrollbar">
              {countdowns.length === 0 ? (
                <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center p-6 text-neutral-400">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-500 mb-3">
                    <Hourglass size={24} />
                  </div>
                  <p className="font-display font-semibold text-white text-sm mb-1">
                    {t('Countdown_NoCountdowns')}
                  </p>
                  <p className="text-xs text-neutral-500 max-w-[200px] mb-4">
                    {t('Countdown_Subtitle')}
                  </p>
                  {!isAddOpen && (
                    <button
                      type="button"
                      onClick={() => setIsAddOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-colors"
                    >
                      <Plus size={14} />
                      {t('Countdown_AddNew')}
                    </button>
                  )}
                </div>
              ) : (
                countdowns.map((c) => {
                  const rem = getRemaining(parseTargetLocal(c), now);
                  const isSelected = c.id === selectedId;
                  const target = parseTargetLocal(c);
                  const formattedDate = target
                    ? new Intl.DateTimeFormat(locale, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(target)
                    : `${c.date} · ${c.time}`;

                  const span = target ? target.getTime() - c.createdAt : 0;
                  const pct =
                    rem.expired || span <= 0
                      ? 100
                      : Math.min(
                          100,
                          Math.max(0, ((now.getTime() - c.createdAt) / span) * 100)
                        );

                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className={cn(
                        'group relative rounded-2xl border p-3.5 sm:p-4 transition-all duration-200 cursor-pointer text-left',
                        isSelected
                          ? 'bg-gradient-to-r from-indigo-600/20 via-indigo-500/10 to-transparent border-indigo-500/60 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/40'
                          : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07] hover:border-white/20'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {/* Aktif odakta göstergesi */}
                          <span
                            className={cn(
                              'w-2 h-2 rounded-full shrink-0 transition-all',
                              isSelected
                                ? 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.9)]'
                                : 'bg-white/20 group-hover:bg-white/40'
                            )}
                          />
                          <h4
                            className={cn(
                              'font-display font-bold text-sm sm:text-base truncate',
                              isSelected ? 'text-indigo-200' : 'text-white'
                            )}
                            title={c.label}
                          >
                            {c.label}
                          </h4>
                        </div>

                        {/* İşlem Düğmeleri */}
                        <div className="flex items-center gap-0.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEdit(c);
                            }}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-indigo-300 hover:bg-indigo-500/15 transition-colors"
                            title={t('Countdown_Edit')}
                            aria-label={t('Countdown_Edit')}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeCountdown(c.id);
                            }}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/15 transition-colors"
                            title={t('Btn_Delete')}
                            aria-label={t('Btn_Delete')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Hedef Tarih & Saat */}
                      <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-1.5 pl-4.5">
                        <CalendarIcon size={12} className="shrink-0 text-neutral-500" />
                        <span className="truncate">{formattedDate}</span>
                      </div>

                      {/* Canlı Kalan Süre Rozeti & Aktif Etiket */}
                      <div className="mt-3 pl-4.5 flex items-center justify-between gap-2">
                        {rem.expired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <PartyPopper size={13} />
                            {t('Countdown_Done')}
                          </span>
                        ) : (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 font-mono text-xs font-bold tabular-nums px-2.5 py-1 rounded-lg border',
                              isSelected
                                ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/40 shadow-sm'
                                : 'bg-white/5 text-neutral-300 border-white/10'
                            )}
                          >
                            <Clock
                              size={12}
                              className={
                                isSelected ? 'text-indigo-400' : 'text-neutral-500'
                              }
                            />
                            {rem.days > 0 ? `${rem.days}g ` : ''}
                            {pad(rem.hours)}:{pad(rem.minutes)}:{pad(rem.seconds)}
                          </span>
                        )}

                        {isSelected && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/30">
                            {t('Countdown_ActiveBadge')}
                          </span>
                        )}
                      </div>

                      {/* İlerleme Çubuğu */}
                      <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mt-3">
                        <div
                          className={cn(
                            'h-full transition-all duration-300 rounded-full',
                            rem.expired
                              ? 'bg-amber-400'
                              : isSelected
                                ? 'bg-indigo-500'
                                : 'bg-neutral-600'
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        {/* Sağ Sütun — Seçili Geri Sayımın Büyük Odak Görünümü */}
        <section className="relative flex-1 min-h-[450px] lg:min-h-0 min-w-0 glass-panel rounded-2xl sm:rounded-3xl border border-white/10 p-4 sm:p-6 flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            {!selected ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center text-center p-6 text-neutral-400"
              >
                <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-500 mb-4 shadow-xl">
                  <Hourglass size={32} />
                </div>
                <h3 className="font-display font-bold text-white text-lg mb-1">
                  {t('Countdown_Empty')}
                </h3>
                <p className="text-sm text-neutral-500 max-w-sm mb-5">
                  {t('Countdown_Subtitle')}
                </p>
                {!isAddOpen && (
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-lg shadow-indigo-600/25 transition-all"
                  >
                    <Plus size={16} />
                    {t('Countdown_AddNew')}
                  </button>
                )}
              </motion.div>
            ) : remaining?.expired ? (
              <motion.div
                key="done"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col items-center justify-center text-center gap-2.5 px-4 min-h-0"
              >
                <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-2">
                  <PartyPopper size={36} className="shrink-0" />
                </div>
                <h3 className="text-2xl font-display font-bold text-white truncate max-w-full">
                  {selected.label}
                </h3>
                <p className="text-lg text-indigo-400 font-display font-bold">
                  {t('Countdown_Reached')}
                </p>
                <p className="text-sm text-neutral-400 flex items-center gap-1.5">
                  <CalendarIcon size={14} className="text-neutral-500" />
                  <span>{targetFormatted}</span>
                </p>
                <button
                  type="button"
                  onClick={() => startEdit(selected)}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors"
                >
                  <Pencil size={14} />
                  {t('Countdown_Edit')}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-h-0 flex flex-col items-center justify-between overflow-hidden py-1 sm:py-2"
              >
                {/* Başlık — Sabit Yükseklik */}
                <div className="shrink-0 text-center w-full min-w-0 px-6 sm:px-10 pb-2 pt-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-2">
                    <Hourglass size={12} />
                    <span>{t('Countdown_ActiveBadge')}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-display font-bold text-white truncate">
                    {selected.label}
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-400 truncate mt-1 flex items-center justify-center gap-1.5">
                    <CalendarIcon size={14} className="text-neutral-500" />
                    <span>{targetFormatted}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => startEdit(selected)}
                    className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors"
                  >
                    <Pencil size={13} />
                    {t('Countdown_Edit')}
                  </button>
                </div>

                {/* Halka — Dikey Alanı Doldurur, Taşmaz */}
                <div className="flex-1 min-h-0 w-full flex items-center justify-center py-2">
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
                          strokeDashoffset:
                            RING_CIRCUMFERENCE * (1 - progressPercent / 100),
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
                      <span className="text-[10px] sm:text-xs font-bold text-neutral-400 uppercase tracking-[0.2em] mt-2">
                        {remaining && remaining.days > 0
                          ? t('Countdown_DaysUnit')
                          : t('Countdown_Remaining')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Birimler — Sabit Alt Şerit */}
                <div className="shrink-0 w-full max-w-md mx-auto grid grid-cols-4 gap-2 sm:gap-3 pt-2">
                  <CountdownUnit
                    value={remaining?.days ?? 0}
                    label={t('Countdown_Days')}
                  />
                  <CountdownUnit
                    value={remaining?.hours ?? 0}
                    label={t('Countdown_Hours')}
                  />
                  <CountdownUnit
                    value={remaining?.minutes ?? 0}
                    label={t('Countdown_Minutes')}
                  />
                  <CountdownUnit
                    value={remaining?.seconds ?? 0}
                    label={t('Countdown_Seconds')}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}
