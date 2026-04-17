import React, { useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, X, GripHorizontal, RotateCcw } from 'lucide-react';
import { useTimer } from '../lib/TimerContext';
import { formatDuration, cn } from '../lib/utils';
import PopoutWindow from './PopoutWindow';

const formatStopwatch = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
};

export default function FloatingWidget() {
  const { 
    pomoActive, pomoTimeLeft, pomoMode, togglePomo, resetPomo,
    cdActive, cdTimeLeft, pauseCountdown, resetCountdown,
    swActive, swTime, toggleStopwatch, resetStopwatch,
    activePipWidget, pipWindow, closePip
  } = useTimer();

  // Determine which timer to show.
  let showWidget = false;
  let timeStr = '';
  let label = '';
  let isActive = false;
  let onToggle = () => {};
  let onReset = () => {};
  let showControls = true;

  // Check which PiP is explicitly requested
  if (activePipWidget === 'pomodoro') {
    showWidget = true;
    timeStr = formatDuration(pomoTimeLeft);
    label = pomoMode === 'Work' ? 'Odak' : 'Mola';
    isActive = pomoActive;
    onToggle = togglePomo;
    onReset = resetPomo;
  } else if (activePipWidget === 'countdown') {
    showWidget = true;
    timeStr = formatDuration(cdTimeLeft);
    label = 'Geri Sayım';
    isActive = cdActive;
    onToggle = pauseCountdown;
    onReset = resetCountdown;
  } else if (activePipWidget === 'stopwatch') {
    showWidget = true;
    timeStr = formatStopwatch(swTime);
    label = 'Kronometre';
    isActive = swActive;
    onToggle = toggleStopwatch;
    onReset = resetStopwatch;
  } else if (activePipWidget === 'localclock') {
    showWidget = true;
    timeStr = new Intl.DateTimeFormat('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date());
    label = 'Yerel Saat';
    showControls = false;
  }

  if (!showWidget) return null;

  const close = useCallback(() => closePip(), [closePip]);
  const popoutFeatures = useMemo(() => ({ width: 420, height: 240, resizable: true }), []);

  const content = (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="glass-panel border border-white/20 rounded-2xl shadow-2xl p-4 flex flex-col gap-4 w-full h-full"
      style={{ touchAction: 'none' }}
    >
      <div className="flex items-center justify-between text-neutral-500 hover:text-white transition-colors">
        <div className="flex items-center gap-2" title={label}>
          <GripHorizontal size={14} />
          <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
        </div>
        <button onClick={close} className="p-1 hover:bg-white/10 rounded-lg transition-colors" title="Kapat">
          <X size={14} />
        </button>
      </div>
      
      <div className="flex-1 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-mono font-bold text-white tracking-tighter tabular-nums text-[clamp(2rem,10vw,3.75rem)] leading-none">
            {timeStr}
          </span>
          {!showControls && (
            <span className="mt-2 text-xs text-neutral-400">
              {new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}
            </span>
          )}
        </div>
        {showControls && (
          <div className="flex items-center gap-2">
            <button
              onClick={onReset}
              className="w-11 h-11 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <RotateCcw size={18} />
            </button>
            <button
              onClick={onToggle}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all",
                isActive ? "bg-rose-500 hover:bg-rose-600 text-white" : "bg-indigo-500 hover:bg-indigo-600 text-white"
              )}
            >
              {isActive ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <PopoutWindow
      title={`${label} • Nexus`}
      isOpen={showWidget}
      onClose={close}
      targetWindow={pipWindow}
      features={popoutFeatures}
    >
      <div className="w-full h-full p-3 bg-transparent">
        {content}
      </div>
    </PopoutWindow>
  );
}
