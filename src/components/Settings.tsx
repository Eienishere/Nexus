import React, { useState, useRef, useEffect } from 'react';
import {
  Bell, Globe, Palette, Database, HelpCircle,
  Download, Upload, Calendar as CalIcon, Volume2, RefreshCw, Save, FolderOpen,
  ShieldAlert, AlertTriangle, Lock
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { t, getLang, setLang as setI18nLang } from '../lib/i18n';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

const THEMES = [
  { id: 'dark', label: 'Theme_Dark', bg: '#0a0a0a', primary: '#6366f1', accent: '#f43f5e' },
  { id: 'light', label: 'Theme_Light', bg: '#f8fafc', primary: '#4f46e5', accent: '#e11d48' },
  { id: 'night-blue', label: 'Theme_NightBlue', bg: '#0c1222', primary: '#3b82f6', accent: '#06b6d4' },
  { id: 'purple', label: 'Theme_Purple', bg: '#0f0720', primary: '#a855f7', accent: '#ec4899' },
  { id: 'forest', label: 'Theme_Forest', bg: '#071208', primary: '#22c55e', accent: '#eab308' },
  { id: 'midnight-aurora', label: 'Theme_MidnightAurora', bg: '#050714', primary: '#8b5cf6', accent: '#34d399' },
  { id: 'arctic-frost', label: 'Theme_ArcticFrost', bg: '#f0f9ff', primary: '#0ea5e9', accent: '#0891b2' },
  { id: 'sunset-ember', label: 'Theme_SunsetEmber', bg: '#0c0806', primary: '#f97316', accent: '#ef4444' },
  { id: 'forest-dusk', label: 'Theme_ForestDusk', bg: '#0a0f07', primary: '#84cc16', accent: '#a3e635' },
  { id: 'rose-quartz', label: 'Theme_RoseQuartz', bg: '#fdf2f8', primary: '#ec4899', accent: '#f43f5e' },
  { id: 'neon-noir', label: 'Theme_NeonNoir', bg: '#030712', primary: '#22d3ee', accent: '#4ade80' },
  { id: 'slate-pro', label: 'Theme_SlatePro', bg: '#0f172a', primary: '#94a3b8', accent: '#e2e8f0' },
  { id: 'golden-hour', label: 'Theme_GoldenHour', bg: '#070b18', primary: '#f59e0b', accent: '#fbbf24' },
  { id: 'custom', label: 'Özel Tema', bg: '#0a0a0a', primary: '#6366f1', accent: '#f43f5e' },
];

const LANGUAGES = [
  { id: 'tr', label: 'Türkçe' },
  { id: 'en', label: 'English' },
];

export default function Settings() {
  const { changePassword, factoryReset, autologinEnabled, toggleAutologin } = useAuth();
  const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem('nexus-theme') || 'dark');
  const [currentLang, setCurrentLang] = useState(() => getLang());
  const [weekStart, setWeekStart] = useState(() => localStorage.getItem('nexus-weekstart') || '1');
  const [notif, setNotif] = useState(true);
  const [sfx, setSfx] = useState(true);

  const [hasCustomAlarm, setHasCustomAlarm] = useState(() => !!localStorage.getItem('nexus-alarm-sound'));
  const [hasCustomNotif, setHasCustomNotif] = useState(() => !!localStorage.getItem('nexus-notif-sound'));

  const [backupFreq, setBackupFreq] = useState('none');
  const [backupPath, setBackupPath] = useState('');
  const [isBackupOpen, setIsBackupOpen] = useState(false);

  // Custom theme colors
  const [customColors, setCustomColors] = useState({
    bg: '#0a0a0a',
    surface: '#171717',
    primary: '#6366f1',
    accent: '#f43f5e',
    text: '#ffffff',
  });

  const themeOpen = false; // replaced by direct usage later
  const langOpen = false;
  const [isThemeOpen, setThemeOpen] = useState(false);
  const [isLangOpen, setLangOpen] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const alarmFileRef = useRef<HTMLInputElement>(null);
  const notifFileRef = useRef<HTMLInputElement>(null);

  // Security States
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(10);
  const [isResetting, setIsResetting] = useState(false);

  const [isAutologinModalOpen, setIsAutologinModalOpen] = useState(false);
  const [autologinPassword, setAutologinPassword] = useState('');
  const [isAutologinSubmitting, setIsAutologinSubmitting] = useState(false);

  useEffect(() => {
    localStorage.setItem('nexus-theme', currentTheme);
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    // Load backend settings
    api.getSettings().then(config => {
      if (config.backup_frequency) {
        setBackupFreq(config.backup_frequency);
      }
      if (config.backup_path) {
        setBackupPath(config.backup_path);
      }
      // Load custom theme colors
      if (config.custom_theme_bg) setCustomColors(prev => ({ ...prev, bg: config.custom_theme_bg }));
      if (config.custom_theme_surface) setCustomColors(prev => ({ ...prev, surface: config.custom_theme_surface }));
      if (config.custom_theme_primary) setCustomColors(prev => ({ ...prev, primary: config.custom_theme_primary }));
      if (config.custom_theme_accent) setCustomColors(prev => ({ ...prev, accent: config.custom_theme_accent }));
      if (config.custom_theme_text) setCustomColors(prev => ({ ...prev, text: config.custom_theme_text }));
      
      // If custom theme is active, apply the CSS variables
      const savedTheme = localStorage.getItem('nexus-theme');
      if (savedTheme === 'custom') {
        applyCustomCSSVars({
          bg: config.custom_theme_bg || '#0a0a0a',
          surface: config.custom_theme_surface || '#171717',
          primary: config.custom_theme_primary || '#6366f1',
          accent: config.custom_theme_accent || '#f43f5e',
          text: config.custom_theme_text || '#ffffff',
        });
      }
    }).catch(console.error);
  }, []);

  const applyCustomCSSVars = (colors: typeof customColors) => {
    const root = document.documentElement;
    root.style.setProperty('--custom-bg', colors.bg);
    root.style.setProperty('--custom-surface', colors.surface);
    root.style.setProperty('--custom-primary', colors.primary);
    root.style.setProperty('--custom-accent', colors.accent);
    root.style.setProperty('--custom-text', colors.text);
    // Derive hover/glow from primary
    root.style.setProperty('--custom-primary-hover', colors.primary);
    root.style.setProperty('--custom-primary-glow', colors.primary + '33');
    root.style.setProperty('--custom-card', colors.surface);
    root.style.setProperty('--custom-glass', colors.surface + 'b3');
  };

  const applyTheme = (themeId: string) => {
    setCurrentTheme(themeId);
    localStorage.setItem('nexus-theme', themeId);
    
    if (themeId === 'custom') {
      applyCustomCSSVars(customColors);
    }
    
    window.dispatchEvent(new CustomEvent('theme-change', { detail: themeId }));
    setThemeOpen(false);
    toast.success(t('Settings_Updated'));
  };

  const saveCustomTheme = async () => {
    try {
      await Promise.all([
        api.updateSetting('custom_theme_bg', customColors.bg),
        api.updateSetting('custom_theme_surface', customColors.surface),
        api.updateSetting('custom_theme_primary', customColors.primary),
        api.updateSetting('custom_theme_accent', customColors.accent),
        api.updateSetting('custom_theme_text', customColors.text),
      ]);
      applyCustomCSSVars(customColors);
      applyTheme('custom');
      toast.success('Özel tema kaydedildi ve uygulandı!');
    } catch {
      toast.error('Tema kaydedilemedi');
    }
  };

  const applyLang = (langId: string) => {
    setCurrentLang(langId);
    setI18nLang(langId);
    setLangOpen(false);
    // Force re-render by reloading
    window.location.reload();
  };

  const applyWeekStart = (val: string) => {
    setWeekStart(val);
    localStorage.setItem('nexus-weekstart', val);
    toast.success(t('Settings_Updated'));
  };

  const toggle = (setter: React.Dispatch<React.SetStateAction<boolean>>, val: boolean) => {
    setter(!val);
    toast.success(t('Settings_Updated'));
  };

  const handleBackupChange = async (freq: string) => {
    setBackupFreq(freq);
    setIsBackupOpen(false);
    try {
      await api.updateSetting('backup_frequency', freq);
      toast.success('Yedekleme ayarları güncellendi');
    } catch {
      toast.error('Ayarlar kaydedilemedi');
    }
  };

  const handleBackupPathSave = async () => {
    try {
      await api.updateSetting('backup_path', backupPath);
      toast.success('Yedekleme yolu kaydedildi');
    } catch {
      toast.error('Yol kaydedilemedi');
    }
  };

  const handleExport = async () => {
    try {
      const [tasks, notes] = await Promise.all([
        api.getTasks().catch(() => []),
        api.getNotes().catch(() => []),
      ]);

      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        app: 'Nexus Productivity Suite',
        data: { tasks, notes },
        settings: {
          theme: currentTheme,
          lang: currentLang,
          weekStart,
          notif,
          sfx
        }
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexus-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('Btn_Export') + ' ✓');
    } catch (e) {
      toast.error(t('Msg_Error'));
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      if (!importData.version || !importData.data) {
        toast.error(t('Msg_Error'));
        return;
      }

      if (!window.confirm(t('Msg_DeleteConfirm'))) return;

      const { tasks = [], notes = [] } = importData.data;
      let imported = 0;

      for (const task of tasks) {
        try {
          await api.updateTask(task.id, task).catch(() => api.createTask(task));
          imported++;
        } catch {}
      }
      for (const note of notes) {
        try {
          await api.updateNote(note.id, note).catch(() => api.createNote(note));
          imported++;
        } catch {}
      }


      // Apply settings if present
      if (importData.settings) {
        const s = importData.settings;
        if (s.theme) applyTheme(s.theme);
        if (s.lang) { setI18nLang(s.lang); setCurrentLang(s.lang); }
        if (s.weekStart) applyWeekStart(s.weekStart);
      }

      toast.success(`${t('Btn_Import')} ✓ — ${imported} items`);
    } catch (err) {
      toast.error(t('Msg_Error'));
    }

    if (importRef.current) importRef.current.value = '';
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'alarm' | 'notif') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limit for localStorage
      toast.error('Ses dosyası 2MB\'den küçük olmalıdır');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (type === 'alarm') {
        localStorage.setItem('nexus-alarm-sound', base64);
        setHasCustomAlarm(true);
        toast.success('Özel alarm sesi kaydedildi');
      } else {
        localStorage.setItem('nexus-notif-sound', base64);
        setHasCustomNotif(true);
        toast.success('Özel bildirim sesi kaydedildi');
      }
    };
    reader.readAsDataURL(file);

    // Clear the input
    e.target.value = '';
  };

  const removeCustomAudio = (type: 'alarm' | 'notif') => {
    if (type === 'alarm') {
      localStorage.removeItem('nexus-alarm-sound');
      setHasCustomAlarm(false);
      toast.success('Varsayılan alarm sesine dönüldü');
    } else {
      localStorage.removeItem('nexus-notif-sound');
      setHasCustomNotif(false);
      toast.success('Varsayılan bildirim sesine dönüldü');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast.error('Tüm alanları doldurun');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Yeni şifre en az 8 karakter olmalıdır');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('Yeni şifreler eşleşmiyor');
      return;
    }
    
    const result = await changePassword(currentPassword, newPassword);
    if (result.success) {
      toast.success('Şifreniz başarıyla değiştirildi!');
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } else {
      toast.error(result.error || 'Şifre değiştirilemedi');
    }
  };

  useEffect(() => {
    let t: NodeJS.Timeout;
    if (isResetModalOpen && resetCountdown > 0) {
      t = setTimeout(() => setResetCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(t);
  }, [isResetModalOpen, resetCountdown]);

  const handleFactoryResetConfirm = async () => {
    setIsResetting(true);
    const result = await factoryReset();
    if (result.success) {
      toast.success('Tüm veriler silindi. Uygulama yeniden başlatılıyor.');
      setTimeout(() => window.location.reload(), 1500);
    } else {
      setIsResetting(false);
      toast.error(result.error || 'Sıfırlama başarısız');
    }
  };

  const handleAutologinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!autologinPassword) return;
    setIsAutologinSubmitting(true);
    const result = await toggleAutologin(true, autologinPassword);
    setIsAutologinSubmitting(false);
    if (result.success) {
      toast.success('Otomatik giriş aktifleştirildi.');
      setIsAutologinModalOpen(false);
      setAutologinPassword('');
    } else {
      toast.error(result.error || 'Aktifleştirilemedi.');
    }
  };

  const currentThemeObj = THEMES.find(t => t.id === currentTheme);
  const currentLangObj = LANGUAGES.find(l => l.id === currentLang);

  return (
    <div className="h-full max-w-4xl mx-auto space-y-12">
      <input type="file" ref={importRef} accept=".json" className="hidden" onChange={handleImport} />
      <input type="file" ref={alarmFileRef} accept="audio/*" className="hidden" onChange={(e) => handleAudioUpload(e, 'alarm')} />
      <input type="file" ref={notifFileRef} accept="audio/*" className="hidden" onChange={(e) => handleAudioUpload(e, 'notif')} />

      <div>
        <h2 className="text-3xl font-display font-bold">{t('Settings_Title')}</h2>
        <p className="text-neutral-500">{t('Settings_Desc')}</p>
      </div>

      <div className="space-y-8 pb-10">
        {/* General */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest px-4">{t('Settings_General')}</h3>
          <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden">
            {/* Language */}
            <div className="relative">
              <div
                onClick={() => { setLangOpen(!isLangOpen); setThemeOpen(false); }}
                className="flex items-center justify-between p-5 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-white/5 text-neutral-400"><Globe size={20} /></div>
                  <span className="font-medium">{t('Settings_Language')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-neutral-500">{currentLangObj?.label}</span>
                  <svg className={cn("w-4 h-4 text-neutral-500 transition-transform", isLangOpen && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
              {isLangOpen && (
                <div className="border-b border-white/5 bg-white/[0.02]">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.id}
                      onClick={() => applyLang(lang.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-8 py-3 hover:bg-white/5 transition-colors text-left",
                        currentLang === lang.id && "text-indigo-400"
                      )}
                    >
                      <span className="font-medium">{lang.label}</span>
                      {currentLang === lang.id && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Theme */}
            <div className="relative">
              <div
                onClick={() => { setThemeOpen(!isThemeOpen); setLangOpen(false); }}
                className="flex items-center justify-between p-5 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-white/5 text-neutral-400"><Palette size={20} /></div>
                  <span className="font-medium">{t('Settings_Theme')}</span>
                </div>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1">
                      <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: currentThemeObj?.bg }} />
                      <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: currentThemeObj?.primary }} />
                      <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: currentThemeObj?.accent }} />
                    </div>
                  <span className="text-sm text-neutral-500">{currentThemeObj ? t(currentThemeObj.label) : ''}</span>
                  <svg className={cn("w-4 h-4 text-neutral-500 transition-transform", isThemeOpen && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
              {isThemeOpen && (
                <div className="border-b border-white/5 bg-white/[0.02] p-4">
                  <div className="grid grid-cols-4 gap-3">
                    {THEMES.filter(t => t.id !== 'custom').map(theme => (
                      <button
                        key={theme.id}
                        onClick={() => applyTheme(theme.id)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all hover:scale-105",
                          currentTheme === theme.id
                            ? "border-indigo-500 bg-indigo-500/10"
                            : "border-white/10 hover:border-white/20"
                        )}
                      >
                        <div className="flex -space-x-1">
                          <div className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: theme.bg }} />
                          <div className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: theme.primary }} />
                          <div className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: theme.accent }} />
                        </div>
                        <span className="text-xs font-medium">{t(theme.label)}</span>
                      </button>
                    ))}
                    <button
                      onClick={() => applyTheme('custom')}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all hover:scale-105",
                        currentTheme === 'custom'
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-white/10 hover:border-white/20"
                      )}
                    >
                      <div className="flex -space-x-1">
                        <div className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: customColors.bg }} />
                        <div className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: customColors.primary }} />
                        <div className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: customColors.accent }} />
                      </div>
                      <span className="text-xs font-medium">Özel Tema</span>
                    </button>
                  </div>
                  
                  {/* Custom Theme Color Picker */}
                  {currentTheme === 'custom' && (
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
                      <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Renkleri Özelleştir</h4>
                      <div className="grid grid-cols-5 gap-3">
                        {[
                          { key: 'bg' as const, label: 'Arkaplan' },
                          { key: 'surface' as const, label: 'Yüzey' },
                          { key: 'primary' as const, label: 'Ana Renk' },
                          { key: 'accent' as const, label: 'Vurgu' },
                          { key: 'text' as const, label: 'Yazı' },
                        ].map(item => (
                          <div key={item.key} className="flex flex-col items-center gap-2">
                            <label className="relative cursor-pointer group">
                              <input 
                                type="color" 
                                value={customColors[item.key]}
                                onChange={e => {
                                  const newColors = { ...customColors, [item.key]: e.target.value };
                                  setCustomColors(newColors);
                                  applyCustomCSSVars(newColors);
                                }}
                                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                              />
                              <div 
                                className="w-10 h-10 rounded-xl border-2 border-white/20 group-hover:border-white/40 transition-colors shadow-lg"
                                style={{ backgroundColor: customColors[item.key] }}
                              />
                            </label>
                            <span className="text-[10px] font-medium text-neutral-500">{item.label}</span>
                            <input
                              type="text"
                              value={customColors[item.key]}
                              onChange={e => {
                                const newColors = { ...customColors, [item.key]: e.target.value };
                                setCustomColors(newColors);
                                if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
                                  applyCustomCSSVars(newColors);
                                }
                              }}
                              className="w-full text-center bg-white/5 border border-white/10 rounded-lg px-1 py-0.5 text-[10px] font-mono focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        ))}
                      </div>
                      <button onClick={saveCustomTheme} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                        <Save size={16} /> Temayı Kaydet
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Week Start */}
            <div
              onClick={() => applyWeekStart(weekStart === '1' ? '0' : '1')}
              className="flex items-center justify-between p-5 hover:bg-white/5 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-white/5 text-neutral-400"><CalIcon size={20} /></div>
                <span className="font-medium">{t('Settings_WeekStart')}</span>
              </div>
              <span className="text-sm text-neutral-500">
                {weekStart === '1' ? t('Settings_WeekStart_Mon') : t('Settings_WeekStart_Sun')}
              </span>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest px-4">{t('Settings_Notifications')}</h3>
          <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden">
            <div
              onClick={() => toggle(setNotif, notif)}
              className="flex items-center justify-between p-5 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-white/5 text-neutral-400"><Bell size={20} /></div>
                <span className="font-medium">{t('Settings_NotifEnabled')}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-neutral-500">{notif ? 'ON' : 'OFF'}</span>
                <div className={cn("w-10 h-5 rounded-full relative transition-colors", notif ? "bg-indigo-600" : "bg-neutral-600")}>
                  <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all", notif ? "right-0.5" : "left-0.5")} />
                </div>
              </div>
            </div>

            {/* Custom Alarm Sound */}
            <div className="flex items-center justify-between p-5 hover:bg-white/5 transition-colors border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-white/5 text-neutral-400"><Bell size={20} /></div>
                <div>
                  <span className="font-medium block">Özel Alarm Sesi (Timer)</span>
                  <span className="text-xs text-neutral-500">{hasCustomAlarm ? "Özel ses yüklendi" : "Varsayılan: Nexus Alarm"}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {hasCustomAlarm && (
                  <button onClick={() => removeCustomAudio('alarm')} className="text-xs text-rose-400 hover:text-rose-300 font-medium px-3 py-1.5 bg-rose-400/10 rounded-lg">Kaldır</button>
                )}
                <button onClick={() => alarmFileRef.current?.click()} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium px-3 py-1.5 bg-indigo-400/10 rounded-lg">Seç (Max 2MB)</button>
              </div>
            </div>

            {/* Custom Notification Sound */}
            <div className="flex items-center justify-between p-5 hover:bg-white/5 transition-colors border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-white/5 text-neutral-400"><Bell size={20} /></div>
                <div>
                  <span className="font-medium block">Özel Bildirim Sesi</span>
                  <span className="text-xs text-neutral-500">{hasCustomNotif ? "Özel ses yüklendi" : "Varsayılan: Nexus Beep"}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {hasCustomNotif && (
                  <button onClick={() => removeCustomAudio('notif')} className="text-xs text-rose-400 hover:text-rose-300 font-medium px-3 py-1.5 bg-rose-400/10 rounded-lg">Kaldır</button>
                )}
                <button onClick={() => notifFileRef.current?.click()} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium px-3 py-1.5 bg-indigo-400/10 rounded-lg">Seç (Max 2MB)</button>
              </div>
            </div>

            <div
              onClick={() => toggle(setSfx, sfx)}
              className="flex items-center justify-between p-5 hover:bg-white/5 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-white/5 text-neutral-400"><Volume2 size={20} /></div>
                <span className="font-medium">{t('Settings_SoundEffects')}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-neutral-500">{sfx ? 'ON' : 'OFF'}</span>
                <div className={cn("w-10 h-5 rounded-full relative transition-colors", sfx ? "bg-indigo-600" : "bg-neutral-600")}>
                  <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all", sfx ? "right-0.5" : "left-0.5")} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest px-4">Güvenlik</h3>
          <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden">
            
            {/* Change Password */}
            <div className="relative">
              <div 
                onClick={() => { setIsChangingPassword(!isChangingPassword); setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword(''); }}
                className="flex items-center justify-between p-5 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"><ShieldAlert size={20} /></div>
                  <span className="font-medium">Master Password Değiştir</span>
                </div>
                <svg className={cn("w-4 h-4 text-neutral-500 transition-transform", isChangingPassword && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
              
              {isChangingPassword && (
                <div className="border-b border-white/5 bg-white/[0.02] p-5">
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400">Mevcut Şifre</label>
                      <input 
                        type="password" 
                        value={currentPassword} 
                        onChange={e => setCurrentPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                        placeholder="Şu anki şifrenizi girin"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400">Yeni Şifre</label>
                      <input 
                        type="password" 
                        value={newPassword} 
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                        placeholder="En az 8 karakter"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400">Yeni Şिफreyi Doğrula</label>
                      <input 
                        type="password" 
                        value={confirmNewPassword} 
                        onChange={e => setConfirmNewPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                        placeholder="Yeni şifreyi tekrar girin"
                      />
                    </div>
                    <div className="pt-2">
                       <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg w-full transition-colors">
                         Şifreyi Değiştir
                       </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Autologin Toggle */}
            <div 
              onClick={() => {
                if (autologinEnabled) {
                  toggleAutologin(false).then(res => {
                    if(res.success) toast.success("Otomatik giriş kapatıldı.");
                    else toast.error(res.error || "Ayar güncellenemedi.");
                  });
                } else {
                  setAutologinPassword("");
                  setIsAutologinModalOpen(true);
                }
              }}
              className="flex items-center justify-between p-5 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20"><Lock size={20} /></div>
                <div>
                  <span className="font-medium text-orange-400">Açılışta Şifre Sorma</span>
                  <p className="text-xs text-neutral-500">Master Password cihazınıza kaydedilir (Önerilmez).</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-neutral-500">{autologinEnabled ? 'AÇIK' : 'KAPALI'}</span>
                <div className={cn("w-10 h-5 rounded-full relative transition-colors", autologinEnabled ? "bg-orange-600" : "bg-neutral-600")}>
                  <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all", autologinEnabled ? "right-0.5" : "left-0.5")} />
                </div>
              </div>
            </div>

            {/* Factory Reset */}
            <div 
              onClick={() => { setIsResetModalOpen(true); setResetCountdown(10); }}
              className="flex items-center justify-between p-5 hover:bg-red-500/10 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 group-hover:bg-red-500 group-hover:text-white transition-colors"><AlertTriangle size={20} /></div>
                <div>
                   <span className="font-medium text-red-400 group-hover:text-red-300">Acil Durum: Verileri Sıfırla</span>
                   <p className="text-xs text-neutral-500">Tüm verileri sil ve uygulamayı başlangıç durumuna döndür.</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Data Management & Backup */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest px-4">{t('Settings_DataMgmt')} & Yedekleme</h3>
          <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden">
            
            {/* Automatic Backup */}
            <div className="relative">
              <div 
                onClick={() => setIsBackupOpen(!isBackupOpen)}
                className="flex items-center justify-between p-5 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-white/5 text-neutral-400"><RefreshCw size={20} /></div>
                  <span className="font-medium">Otomatik Yedekleme</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-neutral-500">
                    {backupFreq === 'none' ? 'Kapalı' : backupFreq === 'hourly' ? 'Saatlik' : backupFreq === 'daily' ? 'Günlük' : backupFreq === 'weekly' ? 'Haftalık' : 'Aylık'}
                  </span>
                  <svg className={cn("w-4 h-4 text-neutral-500 transition-transform", isBackupOpen && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
              {isBackupOpen && (
                <div className="border-b border-white/5 bg-white/[0.02]">
                  {[
                    { id: 'none', label: 'Kapalı' },
                    { id: 'hourly', label: 'Her Saat' },
                    { id: 'daily', label: 'Her Gün' },
                    { id: 'weekly', label: 'Her Hafta' },
                    { id: 'monthly', label: 'Her Ay' },
                  ].map(option => (
                    <button
                      key={option.id}
                      onClick={() => handleBackupChange(option.id)}
                      className={cn(
                        "w-full text-left px-5 py-3 hover:bg-white/5 transition-colors text-sm",
                        backupFreq === option.id ? "text-indigo-400 font-medium" : "text-neutral-400"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Custom Backup Path */}
            <div className="flex items-center justify-between p-5 hover:bg-white/5 transition-colors border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-white/5 text-neutral-400"><FolderOpen size={20} /></div>
                <div>
                  <span className="font-medium block">Yedekleme Klasörü</span>
                  <span className="text-xs text-neutral-500">Boş bırakılırsa varsayılan klasör kullanılır</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={backupPath} 
                  onChange={e => setBackupPath(e.target.value)}
                  placeholder="Örn: C:\Yedekler\Nexus"
                  className="w-64 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500 [color-scheme:dark]"
                />
                <button onClick={handleBackupPathSave} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors">
                  <Save size={14} />
                </button>
              </div>
            </div>

            <div 
              onClick={handleExport}
              className="flex items-center justify-between p-5 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-white/5 text-neutral-400"><Download size={20} /></div>
                <span className="font-medium">{t('Settings_Export')}</span>
              </div>
              <span className="text-indigo-400 text-sm font-bold">{t('Settings_ExportBtn')}</span>
            </div>
            <div 
              onClick={() => importRef.current?.click()}
              className="flex items-center justify-between p-5 hover:bg-white/5 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-white/5 text-neutral-400"><Upload size={20} /></div>
                <span className="font-medium">{t('Settings_Import')}</span>
              </div>
              <span className="text-indigo-400 text-sm font-bold">{t('Settings_ImportBtn')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-8 border-t border-white/10 flex items-center justify-between text-neutral-500 text-sm">
        <div className="flex items-center gap-4">
          <HelpCircle size={18} />
          <span>Nexus v1.0.5 — Production Build</span>
        </div>
      </div>

      {/* Factory Reset Modal within Settings */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-red-500/30 p-8 space-y-6 bg-neutral-900 shadow-[0_0_60px_rgba(239,68,68,0.15)]">
            <h2 className="text-white font-bold text-xl">Fabrika Ayarlarına Sıfırla</h2>
            <p className="text-red-400 text-sm">Bu işlem GERİ ALINAMAZ. Tüm görevler, notlar, ayarlar ve veritabanı dosyaları (yedekler dahil) kalıcı olarak silinecektir.</p>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="flex-1 py-3 rounded-2xl border border-white/10 text-neutral-300 hover:bg-white/5 transition-colors font-medium"
              >
                İptal
              </button>
              <button
                onClick={handleFactoryResetConfirm}
                disabled={resetCountdown > 0 || isResetting}
                className="flex-1 py-3 rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-red-600 text-white hover:bg-red-700"
              >
                {isResetting ? 'Siliniyor...' : resetCountdown > 0 ? `Bekleyin (${resetCountdown}s)` : 'Sıfırla ve Sil'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Autologin Settings Modal */}
      {isAutologinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-orange-500/30 p-8 space-y-6 bg-neutral-900 shadow-[0_0_60px_rgba(249,115,22,0.15)]">
            <h2 className="text-white font-bold text-xl">Otomatik Girişi Aktifleştir</h2>
            <p className="text-orange-400 text-sm">Cihazınızda mevcut veritabanını çözmek için anahtar kaydedilecektir. Kendi cihazınız değilse bu özelliği açmayın.</p>
            <form onSubmit={handleAutologinSubmit} className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs text-neutral-400">Mevcut Master Password</label>
                <input 
                  type="password" 
                  value={autologinPassword} 
                  onChange={e => setAutologinPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                  placeholder="Onaylamak için şifrenizi girin"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAutologinModalOpen(false)}
                  className="flex-1 py-3 rounded-2xl border border-white/10 text-neutral-300 hover:bg-white/5 transition-colors font-medium"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={!autologinPassword || isAutologinSubmitting}
                  className="flex-1 py-3 rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-orange-600 text-white hover:bg-orange-700"
                >
                  {isAutologinSubmitting ? 'Aktifleştiriliyor...' : 'Aktifleştir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
