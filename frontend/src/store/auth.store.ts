import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: 'ADMINISTRATOR' | 'STORE_MANAGER' | 'STOREKEEPER' | 'AUDITOR' | 'REQUESTER';
  departmentId?: string | null;
  departmentName?: string | null;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  setSession: (sessionPayload: any) => void;
  setUser: (user: AuthUser) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setSession: (sessionPayload) => {
        const data = sessionPayload?.data || sessionPayload;
        set({
          accessToken: data?.accessToken || null,
          user: data?.user || null,
        });
      },
      setUser: (user) => set({ user }),
      clearSession: () => set({ accessToken: null, user: null }),
    }),
    { name: 'store-mgmt-auth' },
  ),
);
