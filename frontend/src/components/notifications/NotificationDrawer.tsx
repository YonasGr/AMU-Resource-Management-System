import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  CheckCheck,
  Trash2,
  Bell,
  BellOff,
  CheckCircle,
  XCircle,
  PackageCheck,
  FileText,
  AlertTriangle,
  ArrowDownLeft,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { useNotificationStore } from '../../store/notifications.store';
import {
  useNotifications,
  useNotificationMutations,
  AppNotification,
} from '../../hooks/useNotifications';

/* ── helpers ─────────────────────────────────────────── */

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function notifIcon(type: AppNotification['type']) {
  switch (type) {
    case 'REQUEST_SUBMITTED':
      return <FileText className="h-4 w-4 text-indigo-500" />;
    case 'REQUEST_APPROVED':
      return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    case 'REQUEST_REJECTED':
      return <XCircle className="h-4 w-4 text-rose-500" />;
    case 'REQUEST_ISSUED':
      return <PackageCheck className="h-4 w-4 text-blue-500" />;
    case 'LOW_STOCK_ALERT':
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case 'STOCK_IN_RECORDED':
      return <ArrowDownLeft className="h-4 w-4 text-teal-500" />;
    default:
      return <Bell className="h-4 w-4 text-slate-400" />;
  }
}

function notifLinkPath(notif: AppNotification): string | null {
  switch (notif.type) {
    case 'REQUEST_SUBMITTED':
    case 'REQUEST_APPROVED':
    case 'REQUEST_REJECTED':
    case 'REQUEST_ISSUED':
      return '/requests';
    case 'LOW_STOCK_ALERT':
      return '/materials';
    case 'STOCK_IN_RECORDED':
      return '/inventory';
    default:
      return null;
  }
}

/* ── item component ───────────────────────────────────── */

function NotificationItem({
  notif,
  onMarkRead,
}: {
  notif: AppNotification;
  onMarkRead: (id: string) => void;
}) {
  const navigate = useNavigate();
  const closeDrawer = useNotificationStore((s) => s.closeDrawer);

  const handleClick = () => {
    if (!notif.isRead) onMarkRead(notif.id);
    const path = notifLinkPath(notif);
    if (path) {
      closeDrawer();
      navigate(path);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full text-left px-4 py-3.5 flex gap-3 transition-colors',
        'border-b border-slate-100 last:border-0',
        notif.isRead
          ? 'bg-white hover:bg-slate-50'
          : 'bg-indigo-50/60 hover:bg-indigo-50',
      )}
    >
      {/* Icon */}
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white shadow-sm border border-slate-200">
        {notifIcon(notif.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              'text-sm leading-snug truncate',
              notif.isRead ? 'font-medium text-slate-700' : 'font-semibold text-slate-900',
            )}
          >
            {notif.title}
          </p>
          {!notif.isRead && (
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
          )}
        </div>
        <p className="mt-0.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">
          {notif.message}
        </p>
        <p className="mt-1 text-[10px] font-medium text-slate-400 uppercase tracking-wide">
          {relativeTime(notif.createdAt)}
        </p>
      </div>
    </button>
  );
}

/* ── skeleton loader ──────────────────────────────────── */

function NotificationSkeleton() {
  return (
    <div className="px-4 py-3.5 flex gap-3 animate-pulse border-b border-slate-100">
      <div className="h-8 w-8 rounded-full bg-slate-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-3/4 rounded bg-slate-200" />
        <div className="h-3 w-full rounded bg-slate-100" />
        <div className="h-2 w-1/4 rounded bg-slate-100" />
      </div>
    </div>
  );
}

/* ── drawer component ─────────────────────────────────── */

export function NotificationDrawer() {
  const isOpen = useNotificationStore((s) => s.isDrawerOpen);
  const closeDrawer = useNotificationStore((s) => s.closeDrawer);

  const { data: notifications, isLoading } = useNotifications();
  const { markRead, markAllRead, clearRead } = useNotificationMutations();

  // Close on outside click
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closeDrawer();
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isOpen, closeDrawer]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeDrawer();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, closeDrawer]);

  const unreadCount = (notifications ?? []).filter((n) => !n.isRead).length;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[2px] transition-opacity duration-200',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Notifications"
        className={cn(
          'fixed top-0 right-0 z-50 h-full w-[380px] max-w-full bg-white shadow-2xl',
          'flex flex-col transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Bell className="h-5 w-5 text-indigo-600" strokeWidth={2} />
            <h2 className="font-bold text-slate-900">Notifications</h2>
            {unreadCount > 0 && (
              <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
                {unreadCount} new
              </span>
            )}
          </div>
          <button
            onClick={closeDrawer}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-2">
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending || unreadCount === 0}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors',
              unreadCount > 0
                ? 'text-indigo-600 hover:bg-indigo-100'
                : 'text-slate-400 cursor-not-allowed',
            )}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <button
            onClick={() => clearRead.mutate()}
            disabled={clearRead.isPending}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear read
          </button>
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="divide-y divide-slate-100">
              {[...Array(5)].map((_, i) => (
                <NotificationSkeleton key={i} />
              ))}
            </div>
          ) : !notifications || notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-16 text-slate-400">
              <BellOff className="h-12 w-12 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">You're all caught up!</p>
              <p className="text-xs text-slate-400">No notifications yet.</p>
            </div>
          ) : (
            <div>
              {notifications.map((notif) => (
                <NotificationItem
                  key={notif.id}
                  notif={notif}
                  onMarkRead={(id) => markRead.mutate(id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications && notifications.length > 0 && (
          <div className="shrink-0 border-t border-slate-100 px-5 py-3 text-center">
            <p className="text-xs text-slate-400">
              Showing {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
