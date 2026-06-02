/**
 * Timer Web Worker
 * 
 * Tarayıcılar arka plandaki sekmelerde setInterval'ı throttle eder (min 1s).
 * Worker thread'leri bu kısıtlamadan muaftır, bu sayede PiP yüzen penceresi
 * masaüstüne taşındığında bile timer'lar sorunsuz çalışır.
 * 
 * Protokol:
 *   Ana thread → Worker:  { command: 'start', intervalMs: number } | { command: 'stop' }
 *   Worker → Ana thread:  'tick'
 */

let timer: ReturnType<typeof setInterval> | null = null;

self.onmessage = (e: MessageEvent) => {
  const { command, intervalMs } = e.data;

  if (command === 'start') {
    // Önceki interval varsa temizle
    if (timer !== null) clearInterval(timer);
    timer = setInterval(() => {
      self.postMessage('tick');
    }, intervalMs ?? 50);
  } else if (command === 'stop') {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }
};
