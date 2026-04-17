import React, { useEffect, useState } from 'react';
import {
  Play, Pause, RotateCcw, Zap, BellPlus, Trash2, Check, MonitorPlay
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { formatDuration } from '../lib/utils';
import { cn } from '../lib/utils';
import { getLang, t } from '../lib/i18n';
import { useTimer } from '../lib/TimerContext';

export default function TimerModule() {
  const [activeTab, setActiveTab] = useState<'local' | 'stopwatch' | 'countdown' | 'alarm'>('local');
  const [laps, setLaps] = useState<number[]>([]);
  const [cdInput, setCdInput] = useState({ h: 0, m: 0, s: 0 });
  const [newAlarmTime, setNewAlarmTime] = useState('07:00');
  const [newAlarmLabel, setNewAlarmLabel] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [now, setNow] = useState(() => new Date());

  const {
    swTime,
    swActive,
    toggleStopwatch,
    resetStopwatch,
    cdTimeLeft,
    cdActive,
    startCountdown: startCtxCountdown,
    pauseCountdown,
    resetCountdown,
    openPip,
    alarms,
    createAlarm,
    updateAlarm,
    deleteAlarm,
  } = useTimer();

  const dayOptions = [
    { id: '1', label: 'Pzt' },
    { id: '2', label: 'Sal' },
    { id: '3', label: 'Car' },
    { id: '4', label: 'Per' },
    { id: '5', label: 'Cum' },
    { id: '6', label: 'Cmt' },
    { id: '0', label: 'Paz' },
  ];
  const lang = getLang() === 'en' ? 'en-US' : 'tr-TR';

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatStopwatch = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  };

  const startCountdown = () => {
    const totalSeconds = cdInput.h * 3600 + cdInput.m * 60 + cdInput.s;
    if (totalSeconds > 0) {
      startCtxCountdown(totalSeconds);
    }
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  };

  const setAlarmPreset = (preset: 'daily' | 'weekdays' | 'weekend' | 'once') => {
    if (preset === 'daily') setSelectedDays(['0', '1', '2', '3', '4', '5', '6']);
    if (preset === 'weekdays') setSelectedDays(['1', '2', '3', '4', '5']);
    if (preset === 'weekend') setSelectedDays(['0', '6']);
    if (preset === 'once') setSelectedDays([]);
  };

  const createNewAlarm = async () => {
    try {
      await createAlarm({
        id: uuidv4(),
        time: newAlarmTime,
        label: newAlarmLabel.trim() || 'Alarm',
        active: true,
        days: selectedDays,
      });
      setNewAlarmLabel('');
      setSelectedDays([]);
      toast.success(t('Clock_AlarmSet'));
    } catch {
      toast.error(t('Msg_Error'));
    }
  };

  return (
    <div className="h-full flex flex-col space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-4xl font-display font-bold tracking-tight">{t('Nav_Clock')}</h2>
          </div>
        <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10">
          <button
            onClick={() => setActiveTab('local')}
            className={cn(
              "px-5 py-2 rounded-xl text-sm font-semibold transition-all",
              activeTab === 'local'
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            )}
          >
            {t('Nav_Clock')}
          </button>
          <button
            onClick={() => setActiveTab('stopwatch')}
            className={cn(
              "px-5 py-2 rounded-xl text-sm font-semibold transition-all",
              activeTab === 'stopwatch'
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            )}
          >
            {t('Clock_StopwatchTab')}
          </button>
          <button
            onClick={() => setActiveTab('countdown')}
            className={cn(
              "px-5 py-2 rounded-xl text-sm font-semibold transition-all",
              activeTab === 'countdown'
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            )}
          >
            {t('Clock_CountdownTab')}
          </button>
          <button
            onClick={() => setActiveTab('alarm')}
            className={cn(
              "px-5 py-2 rounded-xl text-sm font-semibold transition-all",
              activeTab === 'alarm'
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            )}
          >
            {t('Clock_Alarms')}
          </button>
        </div>
      </div>

      <div className="flex-1 glass-panel rounded-3xl border border-white/10 p-6 md:p-10">
        <div className="h-full flex flex-col items-center justify-center">
          {activeTab === 'local' ? (
            <div className="w-full max-w-3xl relative flex flex-col items-center justify-center text-center space-y-6">
              <div className="text-6xl md:text-8xl font-mono font-black tracking-tighter text-white tabular-nums">
                {new Intl.DateTimeFormat(lang, {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                }).format(now)}
              </div>
              <div className="space-y-2">
                <p className="text-2xl md:text-3xl font-display font-bold text-white">
                  {new Intl.DateTimeFormat(lang, {
                    weekday: 'long',
                  }).format(now)}
                </p>
                <p className="text-neutral-400 text-base md:text-lg">
                  {new Intl.DateTimeFormat(lang, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  }).format(now)}
                </p>
              </div>
            </div>
          ) : activeTab === 'stopwatch' ? (
            <div className="w-full max-w-2xl flex flex-col items-center space-y-12">
              <div className="text-7xl md:text-8xl font-mono font-black tracking-tighter text-white tabular-nums">
                {formatStopwatch(swTime)}
              </div>

              <div className="flex items-center gap-6">
                <button
                  onClick={() => { resetStopwatch(); setLaps([]); }}
                  className="p-4 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/10 transition-all"
                >
                  <RotateCcw size={24} />
                </button>
                <button
                  onClick={toggleStopwatch}
                  className={cn(
                    "w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all transform hover:scale-105",
                    swActive ? "bg-rose-600 shadow-rose-500/20" : "bg-indigo-600 shadow-indigo-500/20"
                  )}
                >
                  {swActive ? <Pause size={32} fill="white" /> : <Play size={32} fill="white" className="ml-1" />}
                </button>
                <button
                  onClick={() => setLaps([swTime, ...laps])}
                  disabled={!swActive}
                  className="p-4 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/10 transition-all disabled:opacity-30"
                >
                  <Zap size={24} />
                </button>
                <button
                  onClick={() => openPip('stopwatch')}
                  className="p-4 rounded-full bg-white/5 hover:bg-indigo-500/20 text-neutral-400 hover:text-indigo-300 transition-all border border-white/10"
                  title="Yüzen Pencere (PiP)"
                >
                  <MonitorPlay size={24} />
                </button>
              </div>

              <div className="w-full max-h-64 overflow-y-auto space-y-2 pr-2">
                {laps.map((lap, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                    <span className="text-neutral-500 font-bold text-sm tracking-wide">{t('Clock_Lap')} {laps.length - i}</span>
                    <span className="font-mono font-bold">{formatStopwatch(lap)}</span>
                    <span className="text-indigo-400 text-xs font-bold">+{formatStopwatch(i === laps.length - 1 ? lap : lap - laps[i + 1])}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === 'countdown' ? (
            <div className="w-full max-w-2xl flex flex-col items-center space-y-12">
              {cdActive ? (
                <div className="text-7xl md:text-8xl font-mono font-black tracking-tighter text-white tabular-nums">
                  {formatDuration(cdTimeLeft)}
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-4">
                  {['h', 'm', 's'].map((unit) => (
                    <div key={unit} className="flex flex-col items-center">
                      <input
                        type="number"
                        value={cdInput[unit as keyof typeof cdInput]}
                        onChange={(e) => setCdInput({ ...cdInput, [unit]: parseInt(e.target.value, 10) || 0 })}
                        className="w-24 h-24 bg-white/5 border border-white/10 rounded-2xl text-4xl font-mono font-bold text-center focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                      <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest mt-2">
                        {unit === 'h' ? t('Clock_Hours') : unit === 'm' ? t('Clock_Minutes') : t('Clock_Seconds')}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-6">
                <button
                  onClick={resetCountdown}
                  className="p-4 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/10 transition-all"
                >
                  <RotateCcw size={24} />
                </button>
                <button
                  onClick={cdActive ? pauseCountdown : startCountdown}
                  className={cn(
                    "w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all transform hover:scale-105",
                    cdActive ? "bg-rose-600 shadow-rose-500/20" : "bg-indigo-600 shadow-indigo-500/20"
                  )}
                >
                  {cdActive ? <Pause size={32} fill="white" /> : <Play size={32} fill="white" className="ml-1" />}
                </button>
                <button
                  onClick={() => openPip('countdown')}
                  className="p-4 rounded-full bg-white/5 hover:bg-indigo-500/20 text-neutral-400 hover:text-indigo-300 transition-all border border-white/10"
                  title="Yüzen Pencere (PiP)"
                >
                  <MonitorPlay size={24} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 w-full max-w-md">
                {[5, 10, 15, 30, 45, 60].map((m) => (
                  <button
                    key={m}
                    onClick={() => setCdInput({ h: 0, m, s: 0 })}
                    className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-indigo-600/20 hover:border-indigo-500/50 transition-all text-sm font-bold text-neutral-200"
                  >
                    {m} dk
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="w-full max-w-4xl space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <BellPlus size={18} className="text-indigo-400" />
                    <span>{t('Clock_SetAlarm')}</span>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs uppercase tracking-widest text-neutral-500">{t('Cal_TimeLabel')}</label>
                    <input
                      type="time"
                      value={newAlarmTime}
                      onChange={(e) => setNewAlarmTime(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-lg font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs uppercase tracking-widest text-neutral-500">{t('Cal_EventTitleLabel')}</label>
                    <input
                      type="text"
                      value={newAlarmLabel}
                      onChange={(e) => setNewAlarmLabel(e.target.value)}
                      placeholder="Alarm etiketi"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs uppercase tracking-widest text-neutral-500">Tekrar</label>
                    <div className="flex flex-wrap gap-2">
                      {dayOptions.map((day) => (
                        <button
                          key={day.id}
                          onClick={() => toggleDay(day.id)}
                          className={cn(
                            "px-3 py-2 rounded-lg text-xs font-semibold border transition-all",
                            selectedDays.includes(day.id)
                              ? "bg-indigo-600 border-indigo-500 text-white"
                              : "bg-white/5 border-white/10 text-neutral-400 hover:text-white"
                          )}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setAlarmPreset('once')} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-neutral-300 hover:text-white">Bir Kez</button>
                      <button onClick={() => setAlarmPreset('daily')} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-neutral-300 hover:text-white">Her Gün</button>
                      <button onClick={() => setAlarmPreset('weekdays')} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-neutral-300 hover:text-white">Hafta İçi</button>
                      <button onClick={() => setAlarmPreset('weekend')} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-neutral-300 hover:text-white">Hafta Sonu</button>
                    </div>
                  </div>

                  <button
                    onClick={createNewAlarm}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-500/20"
                  >
                    <BellPlus size={18} />
                    <span>{t('Clock_SetAlarm')}</span>
                  </button>
                </div>

                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                  <h3 className="text-white font-semibold mb-4">{t('Clock_Alarms')}</h3>
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
                    {alarms.length === 0 && (
                      <p className="text-neutral-500 text-sm">{t('Clock_NoAlarms')}</p>
                    )}
                    {alarms.map((alarm: any) => (
                      <div key={alarm.id} className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-2xl font-mono font-bold tracking-tight">{alarm.time}</p>
                            <p className="text-sm text-neutral-400">{alarm.label || 'Alarm'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateAlarm(alarm.id, { active: !alarm.active })}
                              className={cn(
                                "px-3 py-2 rounded-lg text-xs font-semibold border transition-all",
                                alarm.active
                                  ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/40"
                                  : "bg-white/5 text-neutral-400 border-white/10"
                              )}
                            >
                              {alarm.active ? 'Açık' : 'Kapalı'}
                            </button>
                            <button
                              onClick={() => deleteAlarm(alarm.id)}
                              className="p-2 rounded-lg bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30"
                              title={t('Btn_Delete')}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {dayOptions.map((day) => {
                            const isSelected = (alarm.days || []).includes(day.id);
                            return (
                              <button
                                key={`${alarm.id}-${day.id}`}
                                onClick={() => {
                                  const nextDays = isSelected
                                    ? (alarm.days || []).filter((d: string) => d !== day.id)
                                    : [...(alarm.days || []), day.id];
                                  updateAlarm(alarm.id, { days: nextDays });
                                }}
                                className={cn(
                                  "px-2.5 py-1.5 rounded-md text-[11px] font-semibold border transition-all",
                                  isSelected
                                    ? "bg-indigo-600/80 border-indigo-500 text-white"
                                    : "bg-white/5 border-white/10 text-neutral-500"
                                )}
                              >
                                {day.label}
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex items-center gap-2">
                          <Check size={14} className="text-neutral-500" />
                          <span className="text-xs text-neutral-500">
                            {(alarm.days || []).length === 0 ? 'Bir kez çalar' : 'Tekrarlı alarm'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
