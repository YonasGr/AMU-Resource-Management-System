import { Bell } from 'lucide-react';
import { useNotificationStore } from '../../store/notifications.store';
import { useUnreadCount } from '../../hooks/useNotifications';
import { cn } from '../../lib/cn';

export function NotificationBell() {
  // Kick off the polling so the count stays fresh
  useUnreadCount();

  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const toggleDrawer = useNotificationStore((s) => s.toggleDrawer);
  const isDrawerOpen = useNotificationStore((s) => s.isDrawerOpen);

  return (
    <button
      onClick={toggleDrawer}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      className={cn(
        'relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
        isDrawerOpen
          ? 'bg-indigo-50 text-indigo-600'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
      )}
    >
      <Bell
        className={cn(
          'h-5 w-5 transition-transform',
          unreadCount > 0 && 'animate-[bell-ring_0.5s_ease-in-out]',
        )}
        strokeWidth={2}
      />
      {unreadCount > 0 && (
        <span
          className={cn(
            'absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center',
            'rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white',
            'ring-2 ring-white',
          )}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
