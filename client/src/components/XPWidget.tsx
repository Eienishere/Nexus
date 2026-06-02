import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Star, Target } from 'lucide-react';
import { useXP } from '../lib/useXP';
import { cn } from '../lib/utils';

export default function XPWidget() {
  const { xp, levelInfo } = useXP();
  const { level, currentXp, nextLevelThreshold, progress } = levelInfo;

  return (
    <div className="p-6 rounded-3xl glass-panel border border-amber-500/10 relative overflow-hidden group">
      {/* Background flare */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none" />
      
      <div className="flex items-center justify-between mb-4 z-10 relative">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-lg shadow-amber-500/20">
            <Trophy size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight flex items-center gap-2">
              Seviye {level}
            </h3>
            <p className="text-xs text-amber-400/80 font-medium tracking-wide uppercase">Productivity</p>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono font-bold text-lg text-amber-400">{currentXp} <span className="text-xs text-neutral-500">XP</span></div>
        </div>
      </div>

      <div className="relative z-10">
        <div className="flex justify-between text-xs text-neutral-400 mb-2 font-medium">
          <span>İlerleme</span>
          <span>{nextLevelThreshold} XP'ye ulaş</span>
        </div>
        <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
          <motion.div 
            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full relative"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <div className="absolute inset-0 bg-white/20 w-full h-full animate-pulse" style={{ animationDuration: '2s' }}/>
          </motion.div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-white/5 flex gap-4 text-xs text-neutral-400 z-10 relative">
        <div className="flex items-center gap-1.5">
          <Target size={14} className="text-rose-400" />
          <span>Görev: +10 XP</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Star size={14} className="text-indigo-400" />
          <span>Odak: +50 XP</span>
        </div>
      </div>
    </div>
  );
}
