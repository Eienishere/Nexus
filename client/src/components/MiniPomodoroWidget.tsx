import React from 'react';
import { Play, Pause, RotateCcw, Timer } from 'lucide-react';
import { useTimer } from '../lib/TimerContext';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export default function MiniPomodoroWidget() {
  const { pomoTimeLeft, pomoActive, pomoMode, togglePomo, resetPomo } = useTimer();

  const minutes = Math.floor(pomoTimeLeft / 60);
  const seconds = pomoTimeLeft % 60;
  
  // Calculate progress for circular ring
  // Default values: Work=25, ShortBreak=5, LongBreak=15 (assuming standard for now to get a ratio)
  const totalTime = pomoMode === 'Work' ? 25*60 : pomoMode === 'ShortBreak' ? 5*60 : 15*60;
  const progress = ((totalTime - pomoTimeLeft) / totalTime) * 100;

  return (
    <div className="p-6 rounded-3xl glass-panel border border-white/5 relative overflow-hidden flex items-center gap-6 group">
      {/* Background glow when active */}
      {pomoActive && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.15 }}
          className={cn(
            "absolute inset-0 blur-3xl",
            pomoMode === 'Work' ? 'bg-rose-500' : 'bg-emerald-500'
          )}
        />
      )}
      
      {/* Circular Progress */}
      <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
          <motion.circle 
            cx="50" cy="50" r="45" fill="none" 
            stroke={pomoMode === 'Work' ? '#f43f5e' : '#10b981'} 
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="283"
            strokeDashoffset={283 - (283 * progress) / 100}
            animate={{ strokeDashoffset: 283 - (283 * progress) / 100 }}
            transition={{ duration: 1 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-display font-bold text-lg leading-none">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
        </div>
      </div>

      <div className="flex-1 z-10">
        <div className="flex items-center gap-2 mb-2">
          <Timer size={16} className={pomoMode === 'Work' ? 'text-rose-400' : 'text-emerald-400'} />
          <h3 className="font-medium text-sm text-neutral-300">
            {pomoMode === 'Work' ? 'Odaklanma Seansı' : 'Dinlenme Molası'}
          </h3>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button 
            onClick={togglePomo}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-colors border",
              pomoActive 
                ? "bg-white/10 border-white/10 hover:bg-white/20 text-white" 
                : "bg-indigo-600 border-indigo-500 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
            )}
          >
            {pomoActive ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
            {pomoActive ? 'Durdur' : 'Başlat'}
          </button>
          <button 
            onClick={resetPomo}
            className="p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-colors text-neutral-400 hover:text-white"
            title="Sıfırla"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
