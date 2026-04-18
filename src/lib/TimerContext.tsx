import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { playSound } from './audio';
import { api } from './api';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { toast } from 'sonner';
import TimerWorker from './timerWorker?worker';

type PomodoroMode = 'Work' | 'ShortBreak' | 'LongBreak';

interface TimerContextState {
  // Pomodoro
  pomoTimeLeft: number;
  pomoActive: boolean;
  pomoMode: PomodoroMode;
  pomoSettings: { Work: number; ShortBreak: number; LongBreak: number };
  setPomoSettings: (s: { Work: number; ShortBreak: number; LongBreak: number }) => void;
  togglePomo: () => void;
  resetPomo: () => void;
  switchPomoMode: (m: PomodoroMode) => void;
  
  // Countdown
  cdTimeLeft: number;
  cdActive: boolean;
  startCountdown: (seconds: number) => void;
  pauseCountdown: () => void;
  resetCountdown: () => void;

  // Active Alarm State
  activeAlarm: { type: 'pomodoro' | 'countdown' | 'alarm', message: string } | null;
  snoozeAlarm: () => void;
  dismissAlarm: () => void;

  // Stopwatch
  swTime: number;
  swActive: boolean;
  toggleStopwatch: () => void;
  resetStopwatch: () => void;

  // Persistent Alarms
  alarms: any[];
  loadAlarms: () => Promise<void>;
  createAlarm: (alarm: any) => Promise<void>;
  updateAlarm: (id: string, updates: any) => Promise<void>;
  deleteAlarm: (id: string) => Promise<void>;

  // PiP Widget
  activePipWidget: 'pomodoro' | 'countdown' | 'stopwatch' | 'localclock' | null;
  setPipWidget: (w: 'pomodoro' | 'countdown' | 'stopwatch' | 'localclock' | null) => void;

  // PiP Popout Window
  pipWindow: Window | null;
  openPip: (w: 'pomodoro' | 'countdown' | 'stopwatch' | 'localclock') => void;
  closePip: () => void;

  // Local clock tick (saniye) — PiP'te saat güncellemesi için
  clockSecond: number;
}

const TimerContext = createContext<TimerContextState | null>(null);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  // Pomodoro
  const [pomoSettings, setPomoSettings] = useState({ Work: 25 * 60, ShortBreak: 5 * 60, LongBreak: 15 * 60 });
  const [pomoTimeLeft, setPomoTimeLeft] = useState(pomoSettings.Work);
  const [pomoActive, setPomoActive] = useState(false);
  const [pomoMode, setPomoMode] = useState<PomodoroMode>('Work');
  
  // Countdown
  const [cdTimeLeft, setCdTimeLeft] = useState(0);
  const [cdActive, setCdActive] = useState(false);

  // Stopwatch
  const [swTime, setSwTime] = useState(0);
  const [swActive, setSwActive] = useState(false);

  // Persistent Alarms
  const [alarms, setAlarms] = useState<any[]>([]);

  // Active Alert
  const [activeAlarm, setActiveAlarm] = useState<{ type: 'pomodoro' | 'countdown' | 'alarm', message: string } | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // PiP State
  const [activePipWidget, setPipWidget] = useState<'pomodoro' | 'countdown' | 'stopwatch' | 'localclock' | null>(null);

  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const pipWindowRef = useRef<Window | null>(null);
  const pomoLastTickRef = useRef<number | null>(null);
  const cdLastTickRef = useRef<number | null>(null);
  const swStartPerfRef = useRef<number | null>(null);
  const swAccumulatedMsRef = useRef(0);

  // Web Worker — tarayıcı arka plan throttling'inden muaf tick kaynağı
  const workerRef = useRef<Worker | null>(null);
  // Tick callback ref'leri — Worker sadece aktif olan fonksiyonları çağırır
  const pomoTickFnRef = useRef<(() => void) | null>(null);
  const cdTickFnRef = useRef<(() => void) | null>(null);
  const swTickFnRef = useRef<(() => void) | null>(null);
  const clockTickFnRef = useRef<(() => void) | null>(null);

  // Local clock PiP için saniye güncelleme state'i
  const [clockSecond, setClockSecond] = useState(0);

  useEffect(() => {
    const worker = new TimerWorker();
    workerRef.current = worker;

    worker.onmessage = () => {
      // Sadece aktif timer'ların tick fonksiyonlarını çağır
      pomoTickFnRef.current?.();
      cdTickFnRef.current?.();
      swTickFnRef.current?.();
      clockTickFnRef.current?.();
    };

    worker.postMessage({ command: 'start', intervalMs: 50 });

    return () => {
      worker.postMessage({ command: 'stop' });
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    pipWindowRef.current = pipWindow;
  }, [pipWindow]);

  const openPip = useCallback((w: 'pomodoro' | 'countdown' | 'stopwatch' | 'localclock') => {
    // Important: `window.open` must run in the click handler to avoid popup blockers.
    const features = 'width=320,height=190,resizable=yes';
    const win = window.open('', 'nexus-pip', features);
    if (!win) {
      toast.error('PiP penceresi engellendi (tarayıcı pop-up izni).');
      return;
    }

    setPipWindow(win);
    setPipWidget(w);
  }, []);

  const closePip = useCallback(() => {
    setPipWidget(null);
    const win = pipWindowRef.current;
    setPipWindow(null);
    try {
      win?.close();
    } catch {
      // ignore
    }
  }, []);

  const loadAlarms = async () => {
    try {
      const data = await api.getAlarms();
      setAlarms(data);
    } catch(e) {}
  };

  useEffect(() => {
    loadAlarms();
  }, []);

  const createAlarm = async (alarm: any) => { await api.createAlarm(alarm); await loadAlarms(); };
  const updateAlarm = async (id: string, updates: any) => { await api.updateAlarm(id, updates); await loadAlarms(); };
  const deleteAlarm = async (id: string) => { await api.deleteAlarm(id); await loadAlarms(); };

  // Pomodoro tick — Worker her 50ms'de çağırır
  useEffect(() => {
    if (!pomoActive) {
      pomoLastTickRef.current = null;
      pomoTickFnRef.current = null;
      return;
    }

    pomoLastTickRef.current = Date.now();

    pomoTickFnRef.current = () => {
      const now = Date.now();
      if (pomoLastTickRef.current === null) {
        pomoLastTickRef.current = now;
        return;
      }

      const elapsedSeconds = Math.floor((now - pomoLastTickRef.current) / 1000);
      if (elapsedSeconds <= 0) return;

      pomoLastTickRef.current += elapsedSeconds * 1000;
      setPomoTimeLeft((prev) => {
        const next = prev - elapsedSeconds;
        if (next <= 0) {
          setPomoActive(false);
          pomoTickFnRef.current = null;
          handlePomoComplete();
          return 0;
        }
        return next;
      });
    };

    return () => { pomoTickFnRef.current = null; };
  }, [pomoActive]);

  // Countdown tick — Worker her 50ms'de çağırır
  useEffect(() => {
    if (!cdActive) {
      cdLastTickRef.current = null;
      cdTickFnRef.current = null;
      return;
    }

    cdLastTickRef.current = Date.now();

    cdTickFnRef.current = () => {
      const now = Date.now();
      if (cdLastTickRef.current === null) {
        cdLastTickRef.current = now;
        return;
      }

      const elapsedSeconds = Math.floor((now - cdLastTickRef.current) / 1000);
      if (elapsedSeconds <= 0) return;

      cdLastTickRef.current += elapsedSeconds * 1000;
      setCdTimeLeft((prev) => {
        const next = prev - elapsedSeconds;
        if (next <= 0) {
          setCdActive(false);
          cdTickFnRef.current = null;
          triggerAlarm('countdown', 'Geri Sayım Tamamlandı!');
          return 0;
        }
        return next;
      });
    };

    return () => { cdTickFnRef.current = null; };
  }, [cdActive]);

  // Stopwatch tick — Worker her 50ms'de çağırır
  useEffect(() => {
    if (!swActive) {
      if (swStartPerfRef.current !== null) {
        swAccumulatedMsRef.current += performance.now() - swStartPerfRef.current;
        swStartPerfRef.current = null;
      }
      swTickFnRef.current = null;
      return;
    }

    swStartPerfRef.current = performance.now();

    swTickFnRef.current = () => {
      const now = performance.now();
      const activeElapsed = swStartPerfRef.current ? now - swStartPerfRef.current : 0;
      setSwTime(Math.floor(swAccumulatedMsRef.current + activeElapsed));
    };

    return () => { swTickFnRef.current = null; };
  }, [swActive]);

  // Local clock PiP tick — sadece localclock PiP açıkken saniye günceller
  useEffect(() => {
    if (activePipWidget !== 'localclock') {
      clockTickFnRef.current = null;
      return;
    }

    let lastSecond = new Date().getSeconds();
    clockTickFnRef.current = () => {
      const now = new Date();
      const sec = now.getSeconds();
      if (sec !== lastSecond) {
        lastSecond = sec;
        setClockSecond(sec);
      }
    };

    return () => { clockTickFnRef.current = null; };
  }, [activePipWidget]);

  // General Background Interval for Clock Alarms
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      if (now.getSeconds() === 0) {
        const currentHm = format(now, 'HH:mm');
        const dayStr = now.getDay().toString(); // 0 (Sun) to 6 (Sat)
        
        alarms.forEach(async (alarm) => {
          if (!alarm.active || alarm.time !== currentHm) return;
          
          // If days array is empty, it's a one-off alarm (rings today).
          // If days array is populated, it only rings if today is in the array.
          if (alarm.days.length === 0 || alarm.days.includes(dayStr)) {
            triggerAlarm('alarm', alarm.label);
            
            // If it's a one-off alarm, deactivate it after ringing.
            if (alarm.days.length === 0) {
              await updateAlarm(alarm.id, { active: false });
            }
          }
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [alarms]);

  const toggleStopwatch = () => {
    if (swActive) {
      if (swStartPerfRef.current !== null) {
        swAccumulatedMsRef.current += performance.now() - swStartPerfRef.current;
        swStartPerfRef.current = null;
      }
      setSwActive(false);
      return;
    }

    swStartPerfRef.current = performance.now();
    setSwActive(true);
  };
  const resetStopwatch = () => {
    swStartPerfRef.current = null;
    swAccumulatedMsRef.current = 0;
    setSwActive(false);
    setSwTime(0);
  };

  const triggerAlarm = async (type: 'pomodoro' | 'countdown' | 'alarm', message: string) => {
    setActiveAlarm({ type, message });
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Nexus Alarm', { body: message, icon: '/favicon.ico' });
    }
    // Play sound
    const audio = await playSound('alarm');
    if (audio) {
      audio.loop = true;
      currentAudioRef.current = audio;
    }
  };

  const handlePomoComplete = async () => {
    try {
      await api.savePomodoroSession({
        id: uuidv4(),
        start_time: new Date(Date.now() - pomoSettings[pomoMode] * 1000).toISOString(),
        end_time: new Date().toISOString(),
        type: pomoMode,
        was_completed: true
      });
    } catch(e) {}

    const title = pomoMode === 'Work' ? 'Odaklanma Süresi Bitti! Dinlenme zamanı.' : 'Dinlenme Bitti! Tekrar odaklanma zamanı.';
    
    // Switch mode automatically
    const nextMode = pomoMode === 'Work' ? 'ShortBreak' : 'Work';
    setPomoMode(nextMode);
    setPomoTimeLeft(pomoSettings[nextMode]);

    triggerAlarm('pomodoro', title);
  };

  const togglePomo = () => {
    if (pomoActive) {
      pomoLastTickRef.current = null;
      setPomoActive(false);
      return;
    }

    pomoLastTickRef.current = Date.now();
    setPomoActive(true);
  };
  const resetPomo = () => {
    pomoLastTickRef.current = null;
    setPomoActive(false);
    setPomoTimeLeft(pomoSettings[pomoMode]);
  };
  const switchPomoMode = (m: PomodoroMode) => {
    pomoLastTickRef.current = null;
    setPomoActive(false);
    setPomoMode(m);
    setPomoTimeLeft(pomoSettings[m]);
  };

  const startCountdown = (sec: number) => {
    cdLastTickRef.current = Date.now();
    setCdTimeLeft(sec);
    setCdActive(true);
  };
  const pauseCountdown = () => {
    cdLastTickRef.current = null;
    setCdActive(false);
  };
  const resetCountdown = () => {
    cdLastTickRef.current = null;
    setCdActive(false);
    setCdTimeLeft(0);
  };

  const snoozeAlarm = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (activeAlarm?.type === 'pomodoro') {
      setPomoTimeLeft(5 * 60); // 5 min snooze
      pomoLastTickRef.current = Date.now();
      setPomoActive(true);
    } else if (activeAlarm?.type === 'countdown') {
      setCdTimeLeft(5 * 60);
      cdLastTickRef.current = Date.now();
      setCdActive(true);
    } else if (activeAlarm?.type === 'alarm') {
      // 5 min snooze for clock alarms. Technically we could create a temp alarm, but this is simpler.
      // Wait, clock alarms are hard-bound to `time`. We'll just trigger it again in 5 minutes via a timeout or a temporary manual alarm state.
      // Actually, creating a temporary alarm is perfect for snooze:
      createAlarm({
        id: uuidv4(),
        time: format(new Date(Date.now() + 5 * 60000), 'HH:mm'),
        label: `Snoozed: ${activeAlarm.message}`,
        active: true,
        days: []
      });
    }
    setActiveAlarm(null);
  };

  const dismissAlarm = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setActiveAlarm(null);
  };

  return (
    <TimerContext.Provider value={{
      pomoTimeLeft, pomoActive, pomoMode, pomoSettings, setPomoSettings, togglePomo, resetPomo, switchPomoMode,
      cdTimeLeft, cdActive, startCountdown, pauseCountdown, resetCountdown,
      swTime, swActive, toggleStopwatch, resetStopwatch,
      activeAlarm, snoozeAlarm, dismissAlarm,
      alarms, loadAlarms, createAlarm, updateAlarm, deleteAlarm,
      activePipWidget, setPipWidget,
      pipWindow,
      openPip,
      closePip,
      clockSecond
    }}>
      {children}
    </TimerContext.Provider>
  );
}

export const useTimer = () => {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used within TimerProvider");
  return ctx;
};
