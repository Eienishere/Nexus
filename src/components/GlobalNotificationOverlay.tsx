import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BellRing, Moon, X } from 'lucide-react';
import { useTimer } from '../lib/TimerContext';

export default function GlobalNotificationOverlay() {
  const { activeAlarm, snoozeAlarm, dismissAlarm } = useTimer();

  return (
    <AnimatePresence>
      {activeAlarm && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 pointer-events-none">
          {/* Backdrop for emphasis */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
          />

          <motion.div
            initial={{ y: -50, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -50, opacity: 0, scale: 0.9 }}
            className="relative bg-neutral-900 border border-white/20 p-6 rounded-3xl shadow-2xl shadow-indigo-500/20 max-w-md w-full mx-4 pointer-events-auto flex flex-col items-center text-center gap-4"
          >
            <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center text-rose-500 mb-2 animate-pulse">
              <BellRing size={32} />
            </div>
            
            <h2 className="text-2xl font-display font-bold text-white">
              {activeAlarm.type === 'pomodoro' ? 'Pomodoro Alarmı' : 'Zamanlayıcı'}
            </h2>
            <p className="text-neutral-400 mb-4">{activeAlarm.message}</p>

            <div className="flex w-full gap-3">
              <button 
                onClick={snoozeAlarm}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-white font-medium"
              >
                <Moon size={18} />
                5 dk Ertele
              </button>
              <button 
                onClick={dismissAlarm}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors text-white font-medium shadow-lg shadow-indigo-500/20"
              >
                <X size={18} />
                Kapat
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
