import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isValid,
} from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { getLang, t } from '../lib/i18n';

const nativeFieldClass =
  'w-full min-w-0 flex-1 bg-transparent border-0 py-0 px-0 text-sm text-white focus:outline-none [color-scheme:dark] min-h-[1.25rem]';

const shellClass =
  'flex items-center gap-3 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 min-h-[3rem] focus-within:border-indigo-500 transition-colors';

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onClose: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onClose, enabled]);
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

/** ISO YYYY-MM-DD → geçerli Date veya null */
export function parseDateIso(value: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (!isValid(dt) || dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
    return null;
  }
  return dt;
}

function parseTimeValue(value: string): { hour: number; minute: number } {
  const match = value.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return { hour: 0, minute: 0 };
  const hour = Math.min(23, Math.max(0, parseInt(match[1], 10) || 0));
  const minute = Math.min(59, Math.max(0, parseInt(match[2], 10) || 0));
  return { hour, minute };
}

interface ModernDateFieldProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ModernDateField({ value, onChange, className }: ModernDateFieldProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const locale = getLang() === 'en' ? enUS : tr;

  const parsed = useMemo(() => parseDateIso(value), [value]);
  const viewAnchor = parsed ?? new Date();

  const [viewMonth, setViewMonth] = useState(viewAnchor);

  useEffect(() => {
    if (parsed) setViewMonth(parsed);
  }, [parsed]);

  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);

  const calendarDays = useMemo(() => {
    if (!isValid(viewMonth)) return [];
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(monthStart);
    return eachDayOfInterval({
      start: startOfWeek(monthStart, { weekStartsOn: 1 }),
      end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
    });
  }, [viewMonth]);

  const weekDays =
    getLang() === 'en'
      ? ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
      : ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  const pick = (day: Date) => {
    onChange(`${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`);
    setOpen(false);
  };

  return (
    <div ref={ref} className={cn('relative min-w-0', className)}>
      <div className={cn(shellClass, open && 'border-indigo-500/50 bg-indigo-500/5')}>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            nativeFieldClass,
            '[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:w-0'
          )}
          aria-label={t('Cal_DateLabel')}
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            'shrink-0 p-1.5 rounded-lg transition-colors',
            open ? 'bg-indigo-600/20 text-indigo-300' : 'text-indigo-400 hover:bg-white/10 hover:text-indigo-300'
          )}
          aria-label={t('Cal_DateLabel')}
          aria-expanded={open}
        >
          <CalendarIcon size={18} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute z-[100] left-0 right-0 mt-3 rounded-2xl glass-panel border border-white/10 shadow-2xl p-5 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => setViewMonth(subMonths(viewMonth, 1))}
                className="p-2 rounded-xl hover:bg-white/10 text-neutral-400 hover:text-white"
                aria-label={t('Btn_Back')}
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-display font-bold text-white capitalize">
                {isValid(viewMonth) ? format(viewMonth, 'MMMM yyyy', { locale }) : '—'}
              </span>
              <button
                type="button"
                onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                className="p-2 rounded-xl hover:bg-white/10 text-neutral-400 hover:text-white"
                aria-label={t('Btn_Next')}
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {weekDays.map((d) => (
                <div key={d} className="text-center text-[10px] font-bold text-neutral-500 py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const inMonth = isSameMonth(day, viewMonth);
                const selected = parsed ? isSameDay(day, parsed) : false;
                const today = isSameDay(day, new Date());
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => pick(day)}
                    className={cn(
                      'h-9 rounded-xl text-sm font-semibold transition-all',
                      !inMonth && 'text-neutral-600',
                      inMonth && !selected && 'text-neutral-200 hover:bg-white/10',
                      selected && 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25',
                      today && !selected && 'ring-1 ring-inset ring-indigo-500/40 text-indigo-300'
                    )}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => pick(new Date())}
              className="w-full mt-3 py-2 rounded-xl text-xs font-semibold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors"
            >
              {t('Cal_Today')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ModernTimeFieldProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ModernTimeField({ value, onChange, className }: ModernTimeFieldProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { hour, minute } = parseTimeValue(value);

  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);

  const setParts = (h: number, m: number) => {
    const nh = Math.min(23, Math.max(0, h));
    const nm = Math.min(59, Math.max(0, m));
    onChange(`${pad(nh)}:${pad(nm)}`);
  };

  return (
    <div ref={ref} className={cn('relative min-w-0', className)}>
      <div className={cn(shellClass, open && 'border-indigo-500/50 bg-indigo-500/5')}>
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            nativeFieldClass,
            'font-mono font-semibold tabular-nums tracking-normal',
            '[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:w-0'
          )}
          aria-label={t('Cal_TimeLabel')}
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            'shrink-0 p-1.5 rounded-lg transition-colors',
            open ? 'bg-indigo-600/20 text-indigo-300' : 'text-indigo-400 hover:bg-white/10 hover:text-indigo-300'
          )}
          aria-label={t('Cal_TimeLabel')}
          aria-expanded={open}
        >
          <Clock size={18} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute z-[100] left-0 right-0 mt-3 rounded-2xl glass-panel border border-white/10 shadow-2xl p-5 backdrop-blur-xl"
          >
            <div className="flex items-center justify-center gap-6">
              <TimeSpinner
                label={t('Clock_Hours')}
                value={hour}
                max={23}
                onChange={(h) => setParts(h, minute)}
              />
              <span className="text-3xl font-mono font-bold text-neutral-500 pb-6">:</span>
              <TimeSpinner
                label={t('Clock_Minutes')}
                value={minute}
                max={59}
                onChange={(m) => setParts(hour, m)}
              />
            </div>

            <div className="flex flex-wrap justify-center gap-2 mt-4 pt-4 border-t border-white/10">
              {[0, 15, 30, 45].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setParts(hour, m);
                    setOpen(false);
                  }}
                  className={cn(
                    'min-w-[3rem] px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all',
                    minute === m
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                      : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white border border-white/10'
                  )}
                >
                  :{pad(m)}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setParts(now.getHours(), now.getMinutes());
                setOpen(false);
              }}
              className="w-full mt-3 py-2 rounded-xl text-xs font-semibold text-neutral-400 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              {t('Countdown_Now')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TimeSpinner({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(value >= max ? 0 : value + 1)}
        className="p-2 rounded-xl text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
        aria-label={`${label} +`}
      >
        <ChevronUp size={18} />
      </button>
      <div className="w-16 h-14 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10">
        <span className="text-3xl font-mono font-black tabular-nums text-white">{pad(value)}</span>
      </div>
      <button
        type="button"
        onClick={() => onChange(value <= 0 ? max : value - 1)}
        className="p-2 rounded-xl text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
        aria-label={`${label} -`}
      >
        <ChevronDown size={18} />
      </button>
      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-0.5">
        {label}
      </span>
    </div>
  );
}
