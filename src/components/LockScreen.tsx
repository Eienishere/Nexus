import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Eye, EyeOff, ShieldAlert, AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

// ─── Nexus Logo (inline SVG) ─────────────────────────────────────────────────
function NexusLogo() {
  return (
    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center shadow-2xl shadow-indigo-500/40">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" className="w-9 h-9">
        <circle cx="16" cy="16" r="4" fill="white" opacity="0.9" />
        <circle cx="48" cy="16" r="4" fill="white" opacity="0.9" />
        <circle cx="32" cy="48" r="4" fill="white" opacity="0.8" />
        <line x1="16" y1="16" x2="48" y2="16" stroke="white" strokeWidth="1.5" opacity="0.6" />
        <line x1="16" y1="16" x2="32" y2="48" stroke="white" strokeWidth="1.5" opacity="0.6" />
        <line x1="48" y1="16" x2="32" y2="48" stroke="white" strokeWidth="1.5" opacity="0.6" />
        <circle cx="32" cy="32" r="2" fill="white" />
      </svg>
    </div>
  );
}

// ─── Strength Meter ───────────────────────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  const getStrength = () => {
    if (password.length === 0) return { score: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 8)  score++;
    if (password.length >= 14) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { score, label: 'Çok Zayıf', color: '#ef4444' };
    if (score === 2) return { score, label: 'Zayıf',     color: '#f97316' };
    if (score === 3) return { score, label: 'Orta',      color: '#eab308' };
    if (score === 4) return { score, label: 'Güçlü',     color: '#22c55e' };
    return              { score, label: 'Çok Güçlü',    color: '#6366f1' };
  };
  const { score, label, color } = getStrength();
  if (!label) return null;

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[1,2,3,4,5].map(i => (
          <div
            key={i}
            className="flex-1 h-1 rounded-full transition-all duration-300"
            style={{ backgroundColor: i <= score ? color : 'rgba(255,255,255,0.1)' }}
          />
        ))}
      </div>
      <p className="text-xs font-medium" style={{ color }}>{label}</p>
    </div>
  );
}

// ─── Factory Reset Modal ──────────────────────────────────────────────────────
function FactoryResetModal({ onClose }: { onClose: () => void }) {
  const { factoryReset } = useAuth();
  const [countdown, setCountdown] = useState(10);
  const [isResetting, setIsResetting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleReset = async () => {
    setIsResetting(true);
    const result = await factoryReset();
    if (result.success) {
      setDone(true);
      // Brief pause then reload so the server-side state resets cleanly
      setTimeout(() => window.location.reload(), 1500);
    } else {
      setIsResetting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-md rounded-3xl border border-red-500/30 p-8 space-y-6"
        style={{ background: 'rgba(12,6,6,0.95)', boxShadow: '0 0 60px rgba(239,68,68,0.15)' }}
      >
        {done ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <CheckCircle size={48} className="text-green-400" />
            <p className="text-white font-bold text-lg">Veriler silindi</p>
            <p className="text-neutral-400 text-sm">Yeniden başlatılıyor…</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle size={24} className="text-red-400" />
              </div>
              <div>
                <h2 className="text-white font-bold text-xl">Fabrika Ayarlarına Sıfırla</h2>
                <p className="text-red-400 text-sm font-medium">Bu işlem GERİ ALINAMAZ</p>
              </div>
            </div>

            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 space-y-2 text-sm">
              <p className="text-red-300 font-medium">Silinecekler:</p>
              <ul className="text-neutral-400 space-y-1 list-disc list-inside">
                <li>Tüm görevler, notlar, hedefler ve ayarlar</li>
                <li>Şifreli veritabanı (nexus.db)</li>
                <li>Tüm yedek dosyaları</li>
                <li>Şifreleme salt dosyası</li>
              </ul>
              <p className="text-red-400 font-bold mt-3">
                ⚠ Şifrenizi unuttuysanız verilerinize erişim teknik olarak imkânsızdır. Bu seçenek yalnızca sıfırdan başlamak için kullanılmalıdır.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl border border-white/10 text-neutral-300 hover:bg-white/5 transition-colors font-medium"
              >
                İptal
              </button>
              <button
                onClick={handleReset}
                disabled={countdown > 0 || isResetting}
                className="flex-1 py-3 rounded-2xl font-bold transition-all relative overflow-hidden"
                style={{
                  background: countdown > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.9)',
                  color: countdown > 0 ? 'rgba(239,68,68,0.6)' : 'white',
                  cursor: countdown > 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {isResetting ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw size={16} className="animate-spin" /> Siliniyor…
                  </span>
                ) : countdown > 0 ? (
                  `Bekleyin (${countdown}s)`
                ) : (
                  'Sıfırla ve Sil'
                )}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Main LockScreen Component ────────────────────────────────────────────────
export default function LockScreen() {
  const { isFirstRun, isLoading, failedAttempts, retryAfterSeconds, setup, unlock } = useAuth();

  // Setup mode: confirm password
  const [password, setPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw]             = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [error, setError]               = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shake, setShake]               = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading) inputRef.current?.focus();
  }, [isLoading]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || retryAfterSeconds > 0) return;
    setError('');

    if (isFirstRun) {
      // ── SETUP MODE ────────────────────────────────
      if (password.length < 8) {
        setError('Şifre en az 8 karakter olmalıdır.');
        triggerShake(); return;
      }
      if (password !== confirmPassword) {
        setError('Şifreler eşleşmiyor.');
        triggerShake(); return;
      }
      setIsSubmitting(true);
      const result = await setup(password);
      setIsSubmitting(false);
      if (!result.success) { setError(result.error ?? 'Kurulum başarısız.'); triggerShake(); }
    } else {
      // ── UNLOCK MODE ───────────────────────────────
      if (!password) { setError('Şifre boş olamaz.'); return; }
      setIsSubmitting(true);
      const result = await unlock(password);
      setIsSubmitting(false);
      if (!result.success) {
        setPassword('');
        setError(result.error ?? 'Yanlış şifre.');
        triggerShake();
      }
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#060612' }}>
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="flex flex-col items-center gap-4"
        >
          <NexusLogo />
          <p className="text-neutral-500 text-sm">Yükleniyor…</p>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 flex items-center justify-center overflow-hidden"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, #1a1040 0%, #060612 60%)' }}
      >
        {/* Ambient glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, #6366f1 0%, transparent 70%)', filter: 'blur(40px)' }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-sm px-4"
        >
          <motion.div
            animate={shake ? { x: [-8, 8, -8, 8, -4, 4, 0] } : {}}
            transition={{ duration: 0.4 }}
          >
            <div
              className="rounded-3xl border border-white/8 p-8 space-y-8"
              style={{
                background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(32px)',
                boxShadow: '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
            >
              {/* Header */}
              <div className="flex flex-col items-center gap-3 text-center">
                <NexusLogo />
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Nexus</h1>
                  <p className="text-neutral-400 text-sm mt-0.5">
                    {isFirstRun
                      ? 'Master Password oluşturun'
                      : 'Veritabanını açmak için şifrenizi girin'}
                  </p>
                </div>
              </div>

              {/* Lock icon badge */}
              {!isFirstRun && (
                <div className="flex justify-center">
                  <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                    <Lock size={20} className="text-indigo-400" />
                  </div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Password */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
                    {isFirstRun ? 'Master Password' : 'Şifre'}
                  </label>
                  <div className="relative">
                    <input
                      ref={inputRef}
                      id="master-password-input"
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(''); }}
                      placeholder={isFirstRun ? 'En az 8 karakter' : '••••••••'}
                      autoComplete={isFirstRun ? 'new-password' : 'current-password'}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 pr-12
                                 text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500/60
                                 focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                    >
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {isFirstRun && <PasswordStrength password={password} />}
                </div>

                {/* Confirm password (setup only) */}
                {isFirstRun && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
                      Tekrar Girin
                    </label>
                    <div className="relative">
                      <input
                        id="confirm-password-input"
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                        placeholder="Şifreyi doğrulayın"
                        autoComplete="new-password"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 pr-12
                                   text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500/60
                                   focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(v => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                      >
                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Error message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 text-red-400 text-sm px-1"
                    >
                      <ShieldAlert size={15} className="shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Lockout countdown */}
                {retryAfterSeconds > 0 && (
                  <div className="text-center text-amber-400 text-sm font-medium">
                    ⏳ {retryAfterSeconds}s sonra tekrar deneyin
                  </div>
                )}

                {/* Failed attempts indicator */}
                {!isFirstRun && failedAttempts > 0 && retryAfterSeconds === 0 && (
                  <div className="text-center text-neutral-500 text-xs">
                    {failedAttempts} başarısız deneme
                  </div>
                )}

                {/* Submit button */}
                <button
                  id="lock-screen-submit"
                  type="submit"
                  disabled={isSubmitting || retryAfterSeconds > 0}
                  className="w-full py-3.5 rounded-2xl font-bold text-white transition-all duration-200 relative overflow-hidden"
                  style={{
                    background: isSubmitting || retryAfterSeconds > 0
                      ? 'rgba(99,102,241,0.3)'
                      : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    boxShadow: isSubmitting || retryAfterSeconds > 0
                      ? 'none'
                      : '0 4px 20px rgba(99,102,241,0.4)',
                  }}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw size={16} className="animate-spin" />
                      {isFirstRun ? 'Oluşturuluyor…' : 'Doğrulanıyor…'}
                    </span>
                  ) : (
                    isFirstRun ? '🔐 Şifremi Oluştur' : '🔓 Kilidi Aç'
                  )}
                </button>
              </form>

              {/* Setup info box */}
              {isFirstRun && (
                <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-xs text-neutral-400 space-y-1.5">
                  <p className="font-semibold text-indigo-300">🛡 Güvenlik Bilgisi</p>
                  <p>Şifreniz <strong className="text-white">Argon2id</strong> ile türetilir ve hiçbir zaman diskte saklanmaz.</p>
                  <p>Şifrenizi unutursanız verilerinize erişmek <strong className="text-red-400">teknik olarak imkânsızdır</strong>.</p>
                </div>
              )}

              {/* Factory reset link */}
              {!isFirstRun && (
                <div className="text-center">
                  <button
                    id="factory-reset-btn"
                    type="button"
                    onClick={() => setShowResetModal(true)}
                    className="text-xs text-neutral-600 hover:text-red-400 transition-colors underline underline-offset-2"
                  >
                    Şifremi unuttum — Verileri sıfırla
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showResetModal && <FactoryResetModal onClose={() => setShowResetModal(false)} />}
      </AnimatePresence>
    </>
  );
}
