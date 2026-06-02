import { useState, useEffect } from 'react';

export function useXP() {
  const [xp, setXp] = useState(() => {
    return parseInt(localStorage.getItem('nexus-xp') || '0', 10);
  });

  useEffect(() => {
    const handleXPChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setXp(detail);
    };
    window.addEventListener('nexus-xp-change', handleXPChange);
    return () => window.removeEventListener('nexus-xp-change', handleXPChange);
  }, []);

  const addXP = (amount: number) => {
    const newXp = xp + amount;
    setXp(newXp);
    localStorage.setItem('nexus-xp', newXp.toString());
    window.dispatchEvent(new CustomEvent('nexus-xp-change', { detail: newXp }));
  };

  const getLevelInfo = (currentXp: number) => {
    let level = 1;
    let threshold = 100;
    let increment = 150;
    let previousThreshold = 0;
    
    while (currentXp >= threshold) {
      level++;
      previousThreshold = threshold;
      threshold += increment;
      increment += 50;
    }
    
    const xpIntoLevel = currentXp - previousThreshold;
    const xpRequiredForNext = threshold - previousThreshold;
    const progress = Math.min(Math.max((xpIntoLevel / xpRequiredForNext) * 100, 0), 100);
    
    return { level, currentXp, nextLevelThreshold: threshold, xpIntoLevel, xpRequiredForNext, progress };
  };

  return { xp, addXP, levelInfo: getLevelInfo(xp) };
}
