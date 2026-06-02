import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, RotateCcw, Coffee, 
  Brain, Settings2, Bell, Volume2,
  CheckCircle2, ListTodo, MonitorPlay
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDuration } from '../lib/utils';

import { cn } from '../lib/utils';
import { t } from '../lib/i18n';
import { api } from '../lib/api';
import { v4 as uuidv4 } from 'uuid';
import { useTimer } from '../lib/TimerContext';

export default function Pomodoro() {
  const { 
    pomoTimeLeft: timeLeft,
    pomoActive: isActive,
    pomoMode: mode,
    pomoSettings: settings,
    setPomoSettings,
    togglePomo: toggleTimer,
    resetPomo: resetTimer,
    switchPomoMode: switchMode,
    openPip
  } = useTimer();

  const [sessions, setSessions] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Settings temp state for modal
  const [tempSettings, setTempSettings] = useState({
    Work: settings.Work / 60,
    ShortBreak: settings.ShortBreak / 60,
    LongBreak: settings.LongBreak / 60,
  });
  
  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Remove local timer logic, handled by TimerContext

  const saveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setPomoSettings({
      Work: tempSettings.Work * 60,
      ShortBreak: tempSettings.ShortBreak * 60,
      LongBreak: tempSettings.LongBreak * 60,
    });
    setIsSettingsOpen(false);
    toast.success('Ayarlar kaydedildi');
  };

  const progress = ((settings[mode] - timeLeft) / settings[mode]) * 100;
  const ringSize = 360;
  const ringCenter = ringSize / 2;
  const ringRadius = 156;
  const ringCircumference = 2 * Math.PI * ringRadius;

  return (
    <div className="h-full w-full flex flex-col items-center justify-center space-y-6 sm:space-y-10 px-2 sm:px-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-4xl font-display font-bold tracking-tight">{t('Pomo_Title')}</h2>
        </div>

      {/* Mode Switcher */}
      <div className="flex flex-wrap justify-center gap-1 bg-white/5 p-1.5 rounded-2xl border border-white/10 w-full max-w-2xl">
        {[
          { id: 'Work', label: t('Pomo_WorkSession'), icon: Brain },
          { id: 'ShortBreak', label: t('Pomo_ShortBreak'), icon: Coffee },
          { id: 'LongBreak', label: t('Pomo_LongBreak'), icon: Coffee },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => switchMode(m.id as any)}
            className={cn(
              "flex-1 min-w-[9rem] sm:flex-initial sm:min-w-0 flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all",
              mode === m.id 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            )}
          >
            <m.icon size={18} />
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {/* Timer Display */}
      <div className="relative group w-full flex justify-center">
        {/* Progress Ring */}
        <svg
          viewBox={`0 0 ${ringSize} ${ringSize}`}
          className="w-[min(82vw,21rem)] h-[min(82vw,21rem)] md:w-[22rem] md:h-[22rem] -rotate-90"
        >
          <circle
            cx={ringCenter}
            cy={ringCenter}
            r={ringRadius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-white/5"
          />
          <motion.circle
            cx={ringCenter}
            cy={ringCenter}
            r={ringRadius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={ringCircumference}
            animate={{ strokeDashoffset: ringCircumference * (1 - progress / 100) }}
            className="text-indigo-500"
            strokeLinecap="round"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl sm:text-6xl md:text-7xl font-mono font-bold tracking-tighter text-white">
            {formatDuration(timeLeft)}
          </span>
          <span className="text-[11px] sm:text-sm font-medium text-neutral-500 uppercase tracking-[0.2em] mt-1.5 sm:mt-2">
            {mode === 'Work' ? 'Odaklanıyor' : 'Dinleniyor'}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 sm:flex items-center gap-3 sm:gap-6 justify-center w-full sm:w-auto max-w-xs sm:max-w-none">
        <button 
          onClick={resetTimer}
          className="p-3 sm:p-4 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-all border border-white/10 justify-self-center"
        >
          <RotateCcw size={24} />
        </button>
        
        <button 
          onClick={toggleTimer}
          className={cn(
            "w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center shadow-2xl transition-all transform hover:scale-105 active:scale-95 justify-self-center",
            isActive 
              ? "bg-rose-600 shadow-rose-500/30" 
              : "bg-indigo-600 shadow-indigo-500/30"
          )}
        >
          {isActive ? <Pause size={26} className="text-white fill-white sm:w-8 sm:h-8" /> : <Play size={26} className="text-white fill-white ml-1 sm:w-8 sm:h-8" />}
        </button>

        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="p-3 sm:p-4 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-all border border-white/10 justify-self-center"
        >
          <Settings2 size={24} />
        </button>

        <button 
          onClick={() => openPip('pomodoro')}
          className="p-3 sm:p-4 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white hover:bg-indigo-500/20 hover:text-indigo-400 transition-all border border-white/10 justify-self-center"
          title="Yüzen Pencere (PiP)"
        >
          <MonitorPlay size={24} />
        </button>
      </div>

      {/* Session Stats */}
      <div className="grid grid-cols-2 gap-4 sm:gap-8 w-full max-w-md pt-6 sm:pt-8 border-t border-white/10">
        <div className="text-center">
          <p className="text-neutral-500 text-sm mb-1">Bugünkü Seans</p>
          <p className="text-2xl font-bold font-display">{sessions}</p>
        </div>
        <div className="text-center">
          <p className="text-neutral-500 text-sm mb-1">Günlük Hedef</p>
          <p className="text-2xl font-bold font-display">8</p>
        </div>
      </div>

      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm glass-panel p-6 rounded-3xl border border-white/10 shadow-2xl"
            >
              <h3 className="text-xl font-bold mb-6">Zamanlayıcı Ayarları (Dk)</h3>
              <form onSubmit={saveSettings} className="space-y-4">
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Odaklanma Süresi</label>
                  <input type="number" min="1" max="120" value={tempSettings.Work} onChange={e => setTempSettings({...tempSettings, Work: parseInt(e.target.value) || 25})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Kısa Mola</label>
                  <input type="number" min="1" max="30" value={tempSettings.ShortBreak} onChange={e => setTempSettings({...tempSettings, ShortBreak: parseInt(e.target.value) || 5})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Uzun Mola</label>
                  <input type="number" min="1" max="60" value={tempSettings.LongBreak} onChange={e => setTempSettings({...tempSettings, LongBreak: parseInt(e.target.value) || 15})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-indigo-500" />
                </div>
                <div className="flex gap-2 pt-4">
                  <button type="button" onClick={() => setIsSettingsOpen(false)} className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-xl">İptal</button>
                  <button type="submit" className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 font-bold text-white rounded-xl">Kaydet</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
