import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { useNotificationStore } from '../store/notifications.store';

export interface AppNotification {
  id: string;
  type:
    | 'REQUEST_SUBMITTED'
    | 'REQUEST_APPROVED'
    | 'REQUEST_REJECTED'
    | 'REQUEST_ISSUED'
    | 'LOW_STOCK_ALERT'
    | 'STOCK_IN_RECORDED';
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

/** Poll unread count every 30 seconds while authenticated */
export function useUnreadCount() {
  const user = useAuthStore((s) => s.user);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);

  const query = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const res = await api.get('/notifications/unread-count');
      return (res.data.data ?? res.data) as { count: number };
    },
    enabled: !!user,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  // Keep Zustand store in sync whenever count changes
  useEffect(() => {
    if (query.data?.count !== undefined) {
      setUnreadCount(query.data.count);
    }
  }, [query.data?.count, setUnreadCount]);

  return query;
}

/** Fetch full notification list (called when drawer opens) */
export function useNotifications() {
  const user = useAuthStore((s) => s.user);
  const isDrawerOpen = useNotificationStore((s) => s.isDrawerOpen);

  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return (res.data.data ?? res.data) as AppNotification[];
    },
    enabled: !!user && isDrawerOpen,
    staleTime: 10_000,
  });
}

/** Mutations */
export function useNotificationMutations() {
  const queryClient = useQueryClient();
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setUnreadCount(0);
    },
  });

  const clearRead = useMutation({
    mutationFn: async () => {
      await api.delete('/notifications/read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  return { markRead, markAllRead, clearRead };
}
