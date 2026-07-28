import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  organizationId: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setSession: (tokens: { accessToken: string; refreshToken: string }, user?: AuthUser) => void;
  setUser: (user: AuthUser) => void;
  clearSession: () => void;
}

/**
 * Persisted to localStorage so a refresh doesn't log the user out.
 * Trade-off worth knowing: localStorage is readable by any script on the
 * page (XSS risk) — an httpOnly cookie would be more secure but needs
 * backend cookie support we haven't built. Fine for now; revisit in the
 * Phase 9 hardening pass if this goes to real production use.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: (tokens, user) =>
        set((state) => ({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: user ?? state.user,
        })),
      setUser: (user) => set({ user }),
      clearSession: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'uerp-auth' },
  ),
);
