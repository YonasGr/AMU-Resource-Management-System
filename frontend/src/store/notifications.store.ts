import { create } from 'zustand';

interface NotificationState {
  unreadCount: number;
  isDrawerOpen: boolean;
  setUnreadCount: (count: number) => void;
  increment: () => void;
  decrement: (by?: number) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  isDrawerOpen: false,

  setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),
  increment: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  decrement: (by = 1) => set((s) => ({ unreadCount: Math.max(0, s.unreadCount - by) })),

  openDrawer: () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false }),
  toggleDrawer: () => set((s) => ({ isDrawerOpen: !s.isDrawerOpen })),
}));
