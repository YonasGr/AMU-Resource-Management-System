import React from 'react';
import { Bell } from 'lucide-react';
import { useNotificationStore } from '../../store/notifications.store';
import { useUnreadCount } from '../../hooks/useNotifications';
import { cn } from '../../lib/cn';

export function NotificationBell() {
  // Kick off polling so the count stays fresh
  useUnreadCount();

  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const toggleDrawer = useNotificationStore((s) => s.toggleDrawer);
  const isDrawerOpen = useNotificationStore((s) => s.isDrawerOpen);

  return (
    <button
      onClick={toggleDrawer}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      className={cn(
        'relative flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-150 border',
        isDrawerOpen
          ? 'bg-teal-50 text-teal-700 border-teal-200 shadow-xs'
          : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50 hover:text-slate-900 shadow-xs',
      )}
    >
      <Bell
        className={cn(
          'h-4.5 w-4.5 transition-transform duration-200',
          unreadCount > 0 && 'text-slate-800',
        )}
        strokeWidth={2.2}
      />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-coral-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}

