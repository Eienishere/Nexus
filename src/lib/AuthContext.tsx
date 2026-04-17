/**
 * AuthContext.tsx — Nexus Master Password Authentication Context
 *
 * Manages the frontend authentication state:
 *  - isFirstRun  : No DB exists → show Setup screen
 *  - isLocked    : DB exists but not unlocked → show Lock screen
 *  - isUnlocked  : Session active → show main app
 *
 * The actual key derivation and DB operations happen server-side.
 * This context only tracks UI state and communicates with /api/auth/*.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthState {
  isFirstRun: boolean;
  isLocked: boolean;
  isLoading: boolean;
  failedAttempts: number;
  retryAfterSeconds: number;
  autologinEnabled: boolean;
}

export interface AuthContextType extends AuthState {
  setup: (password: string) => Promise<{ success: boolean; error?: string }>;
  unlock: (password: string) => Promise<{ success: boolean; error?: string; retryAfterSeconds?: number }>;
  lock: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  factoryReset: () => Promise<{ success: boolean; error?: string }>;
  toggleAutologin: (enable: boolean, password?: string) => Promise<{ success: boolean; error?: string }>;
  refreshStatus: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isFirstRun: false,
    isLocked: true,
    isLoading: true,
    failedAttempts: 0,
    retryAfterSeconds: 0,
    autologinEnabled: false,
  });

  // Countdown timer for brute-force lockout
  useEffect(() => {
    if (state.retryAfterSeconds <= 0) return;
    const interval = setInterval(() => {
      setState(prev => {
        const next = Math.max(0, prev.retryAfterSeconds - 1);
        return { ...prev, retryAfterSeconds: next };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state.retryAfterSeconds > 0]);

  /** Fetch the current auth status from the server. */
  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/status");
      const data = await res.json();
      setState(prev => ({
        ...prev,
        isFirstRun: data.isFirstRun,
        isLocked: data.isLocked,
        autologinEnabled: !!data.autologinEnabled,
        isLoading: false,
      }));
    } catch {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => { refreshStatus(); }, [refreshStatus]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const setup = useCallback(async (password: string) => {
    try {
      const res  = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      setState(prev => ({ ...prev, isFirstRun: false, isLocked: false, failedAttempts: 0 }));
      return { success: true };
    } catch {
      return { success: false, error: "Sunucuya bağlanılamadı." };
    }
  }, []);

  const unlock = useCallback(async (password: string) => {
    try {
      const res  = await fetch("/api/auth/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (!res.ok) {
        const retryAfter = data.retryAfterSeconds ?? 0;
        setState(prev => ({
          ...prev,
          failedAttempts: prev.failedAttempts + 1,
          retryAfterSeconds: Math.max(prev.retryAfterSeconds, retryAfter),
        }));
        return { success: false, error: data.error, retryAfterSeconds: retryAfter };
      }

      setState(prev => ({ ...prev, isLocked: false, failedAttempts: 0, retryAfterSeconds: 0 }));
      return { success: true };
    } catch {
      return { success: false, error: "Sunucuya bağlanılamadı." };
    }
  }, []);

  const lock = useCallback(async () => {
    try {
      await fetch("/api/auth/lock", { method: "POST" });
    } catch {}
    setState(prev => ({ ...prev, isLocked: true, failedAttempts: 0, retryAfterSeconds: 0 }));
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    try {
      const res  = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      return { success: true };
    } catch {
      return { success: false, error: "Sunucuya bağlanılamadı." };
    }
  }, []);

  const factoryReset = useCallback(async () => {
    try {
      const res  = await fetch("/api/auth/factory-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "NEXUS_FACTORY_RESET" }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      // After reset, refresh status so UI shows Setup screen
      await refreshStatus();
      return { success: true };
    } catch {
      return { success: false, error: "Sunucuya bağlanılamadı." };
    }
  }, [refreshStatus]);

  const toggleAutologin = useCallback(async (enable: boolean, password?: string) => {
    try {
      const res = await fetch("/api/auth/autologin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enable, password }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      setState(prev => ({ ...prev, autologinEnabled: data.enabled }));
      return { success: true };
    } catch {
      return { success: false, error: "Sunucuya bağlanılamadı." };
    }
  }, []);

  // ─── Value ────────────────────────────────────────────────────────────────

  const value: AuthContextType = {
    ...state,
    setup,
    unlock,
    lock,
    changePassword,
    factoryReset,
    toggleAutologin,
    refreshStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
