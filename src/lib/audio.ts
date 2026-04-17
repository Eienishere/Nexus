export const playSound = async (type: 'alarm' | 'notification' = 'notification') => {
  try {
    const key = type === 'alarm' ? 'nexus-alarm-sound' : 'nexus-notif-sound';
    const soundData = localStorage.getItem(key);
    
    if (soundData) {
      const audio = new Audio(soundData);
      audio.play().catch(e => console.error("Audio play failed:", e));
      return audio;
    } else {
      // Fallback to default sounds (if we had them in public, we'd use '/alarm.mp3')
      // For now, we vibrate or beep using AudioContext if no file is provided
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'alarm') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(440, ctx.currentTime + 0.2);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      }
      return null;
    }
  } catch (err) {
    console.error("Failed to play sound", err);
    return null;
  }
};
