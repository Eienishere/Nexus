let sharedAudioCtx: AudioContext | null = null;

export const initAudio = () => {
  if (typeof window === 'undefined') return;
  if (!sharedAudioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      sharedAudioCtx = new AudioContextClass();
    }
  }
  if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(e => console.error("AudioContext resume failed:", e));
  }
};

// Initialize / Resume AudioContext on first user interaction to bypass browser restrictions
if (typeof window !== 'undefined') {
  const handleInteraction = () => {
    initAudio();
    if (sharedAudioCtx && sharedAudioCtx.state === 'running') {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    }
  };
  window.addEventListener('click', handleInteraction, { capture: true });
  window.addEventListener('keydown', handleInteraction, { capture: true });
  window.addEventListener('touchstart', handleInteraction, { capture: true });
}

export const playSound = async (type: 'alarm' | 'notification' = 'notification') => {
  try {
    const key = type === 'alarm' ? 'nexus-alarm-sound' : 'nexus-notif-sound';
    const soundData = localStorage.getItem(key);
    
    if (soundData) {
      const audio = new Audio(soundData);
      audio.play().catch(e => console.error("Audio play failed:", e));
      return audio;
    } else {
      // Fallback to default sounds (using shared AudioContext to prevent autoplay blocks in background)
      if (!sharedAudioCtx) {
        initAudio();
      }
      const ctx = sharedAudioCtx;
      if (!ctx) {
        console.warn("AudioContext is not supported/initialized");
        return null;
      }
      
      if (ctx.state === 'suspended') {
        await ctx.resume().catch(e => console.error("Failed to resume AudioContext during playSound:", e));
      }
      
      if (type === 'alarm') {
        let isPlaying = true;
        let timeoutId: any = null;

        const playBeep = () => {
          if (!isPlaying || !ctx) return;
          
          try {
            if (ctx.state === 'suspended') {
              ctx.resume().catch(() => {});
            }
            
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'square';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
            osc.frequency.setValueAtTime(440, ctx.currentTime + 0.2);
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            
            osc.start();
            osc.stop(ctx.currentTime + 0.4);
          } catch (e) {
            console.error("Error playing fallback alarm beep:", e);
          }
          
          timeoutId = setTimeout(playBeep, 1500);
        };

        playBeep();

        return {
          loop: true,
          pause: () => {
            isPlaying = false;
            if (timeoutId) clearTimeout(timeoutId);
          }
        } as any;
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
        return null;
      }
    }
  } catch (err) {
    console.error("Failed to play sound", err);
    return null;
  }
};

