import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, CheckSquare, Calendar as CalendarIcon, Clock, 
  Timer as TimerIcon, Zap, StickyNote,
  Settings as SettingsIcon, Lock, Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { cn } from './lib/utils';
import { t } from './lib/i18n';
import { useAuth } from './lib/AuthContext';

// Components
import Dashboard from './components/Dashboard';
import TaskManager from './components/TaskManager';
import Pomodoro from './components/Pomodoro';
import Calendar from './components/Calendar';
import TimerModule from './components/TimerModule';
import Notes from './components/Notes';
import Settings from './components/Settings';
import QuickAddModal from './components/QuickAddModal';
import OnboardingModal from './components/OnboardingModal';
import GlobalNotificationOverlay from './components/GlobalNotificationOverlay';
import FloatingWidget from './components/FloatingWidget';
import LockScreen from './components/LockScreen';

export default function App() {
  const { isLocked, isFirstRun, isLoading, lock } = useAuth();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState(() => localStorage.getItem('nexus-theme') || 'dark');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => 
    localStorage.getItem('nexus-sidebar-collapsed') === 'true'
  );
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('nexus-sidebar-collapsed', sidebarCollapsed.toString());
  }, [sidebarCollapsed]);

  // Listen for theme changes from Settings
  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const newTheme = (e as CustomEvent).detail;
      setTheme(newTheme);
    };
    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  // Global hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsQuickAddOpen(true);
      }
      // Ctrl+L → lock
      if (e.ctrlKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        handleLock();
      }
    };
    const handleOpenQuickAdd = () => setIsQuickAddOpen(true);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-quick-add', handleOpenQuickAdd);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-quick-add', handleOpenQuickAdd);
    };
  }, []);

  const handleLock = async () => {
    await lock();
    toast.success('Nexus kilitlendi — anahtar bellekten silindi.');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        toast.error(`Tam ekran moduna geçilemedi: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: t('Nav_Dashboard') },
    { id: 'tasks',     icon: CheckSquare,     label: t('Nav_Tasks') },
    { id: 'calendar',  icon: CalendarIcon,    label: t('Nav_Calendar') },
    { id: 'pomodoro',  icon: TimerIcon,       label: t('Nav_Pomodoro') },
    { id: 'clock',     icon: Clock,           label: t('Nav_Clock') },
    { id: 'notes',     icon: StickyNote,      label: t('Nav_Notes') },
    { id: 'settings',  icon: SettingsIcon,    label: t('Nav_Settings') },
  ];

  // ── Show lock/setup screen if locked or first run ───────────────────────
  if (isLoading || isLocked || isFirstRun) {
    return <LockScreen />;
  }

  // ── Main Application ─────────────────────────────────────────────────────
  return (
    <div className="flex min-h-dvh w-full overflow-hidden transition-colors duration-300">
      
      <Toaster position="top-right" theme={theme === 'light' ? 'light' : 'dark'} />
      <GlobalNotificationOverlay />
      <FloatingWidget />

      {/* Sidebar - Collapsible */}
      {isMobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setIsMobileNavOpen(false)}
          aria-label="Menüyü kapat"
        />
      )}

      <aside className={cn(
        "border-r border-white/10 flex flex-col glass-panel z-40",
        "fixed inset-y-0 left-0 md:relative transition-all duration-300 ease-in-out",
        "w-72 max-w-[85vw] md:max-w-none",
        isMobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        "md:flex-shrink-0",
        sidebarCollapsed ? "md:w-20" : "md:w-64"
      )}>
        <div 
          onClick={() => setActiveTab('dashboard')}
          className="p-6 flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
        >
          {!sidebarCollapsed && (
            <h1 className="text-xl font-display font-bold tracking-tight">{t('App_Name')}</h1>
          )}
        </div>

        {/* Toggle Button */}
        <div className="px-4 py-2 flex justify-start">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn(
              "flex items-center justify-center p-2 rounded-lg",
              "text-neutral-400 hover:bg-white/5 hover:text-white",
              "transition-all duration-200 group"
            )}
            title={sidebarCollapsed ? "Menüyü aç" : "Menüyü kapat"}
          >
            <Menu size={20} />
          </button>
        </div>

        <nav className={cn(
          "flex-1 py-4 space-y-1 overflow-y-auto",
          sidebarCollapsed ? "px-2" : "px-4"
        )}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsMobileNavOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                "relative",
                activeTab === item.id 
                  ? "bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500" 
                  : "text-neutral-400 hover:bg-white/5 hover:text-white",
                sidebarCollapsed && "justify-center px-2"
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon size={20} className={cn(activeTab === item.id ? "text-indigo-400" : "group-hover:text-white")} />
              {!sidebarCollapsed && (
                <span className="font-medium">{item.label}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Lock button at bottom of sidebar */}
        <div className={cn(
          "p-4 border-t border-white/5",
          sidebarCollapsed && "p-2"
        )}>
          <button
            id="sidebar-lock-btn"
            onClick={handleLock}
            className={cn(
              "w-full flex items-center gap-3 rounded-lg text-neutral-500",
              "hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 group",
              sidebarCollapsed ? "justify-center p-2" : "px-4 py-3"
            )}
            title="Kilitle (Ctrl+L)"
          >
            <Lock size={sidebarCollapsed ? 18 : 18} className="group-hover:text-red-400 transition-colors flex-shrink-0" />
            {!sidebarCollapsed && (
              <span className="text-sm font-medium">Kilitle</span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col relative overflow-hidden transition-all duration-300">
        {/* Header */}
        <header className="h-16 border-bottom border-white/10 flex items-center justify-between px-3 sm:px-4 md:px-8 glass-panel z-10 w-full">
          <div className="flex flex-1 items-center">
            <button
              onClick={() => setIsMobileNavOpen(true)}
              className="p-2 rounded-lg text-neutral-400 hover:bg-white/5 hover:text-white transition-colors md:hidden"
              title="Menü"
              aria-label="Menüyü aç"
            >
              <Menu size={20} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Lock button in header */}
            <button
              id="header-lock-btn"
              onClick={handleLock}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-neutral-500 
                         hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 text-sm font-medium"
              title="Kilitle (Ctrl+L)"
            >
              <Lock size={15} />
              <span className="hidden sm:inline">Kilitle</span>
            </button>

            <button 
              onClick={toggleFullscreen}
              className="p-2 rounded-full hover:bg-white/5 text-neutral-400 hover:text-white transition-colors"
              title="Tam Ekran"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
              </svg>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-3 py-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'tasks'     && <TaskManager />}
              {activeTab === 'pomodoro'  && <Pomodoro />}
              {activeTab === 'calendar'  && <Calendar />}
              {activeTab === 'clock'     && <TimerModule />}
              {activeTab === 'notes'     && <Notes />}
              {activeTab === 'settings'  && <Settings />}
              {!['dashboard','tasks','pomodoro','calendar','clock','notes','settings'].includes(activeTab) && (
                <div className="flex flex-col items-center justify-center h-full text-neutral-500">
                  <Zap size={48} className="mb-4 opacity-20" />
                  <p className="text-xl font-medium">"{activeTab}" modülü yapım aşamasında</p>
                  <p className="text-sm">Bir sonraki geliştirmede aktif edilecek.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <QuickAddModal isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} />
        <OnboardingModal onComplete={() => {}} />
      </main>
    </div>
  );
}
