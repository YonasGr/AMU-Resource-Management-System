import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckSquare,
  FileText,
  Check,
  X,
  AlertTriangle,
  Package,
  ArrowLeftRight,
  Laptop,
  RotateCcw,
  Trash2,
  Send,
  Bell,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { cn } from '../../lib/cn';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  entityType?: string;
  entityId?: string;
  createdAt: string;
}

const TYPE_MAPPING: Record<string, { icon: any; color: string; bg: string }> = {
  APPROVAL_REQUIRED: { icon: CheckSquare, color: 'text-warning', bg: 'bg-warning/10' },
  REQUEST_SUBMITTED: { icon: FileText, color: 'text-primary', bg: 'bg-primary/10' },
  REQUEST_COMPLETED: { icon: FileText, color: 'text-success', bg: 'bg-success/10' },
  REQUEST_APPROVED: { icon: Check, color: 'text-success', bg: 'bg-success/10' },
  REQUEST_REJECTED: { icon: X, color: 'text-danger', bg: 'bg-danger/10' },
  REQUEST_CANCELLED: { icon: X, color: 'text-danger', bg: 'bg-danger/10' },
  STOCK_LOW: { icon: AlertTriangle, color: 'text-danger', bg: 'bg-danger/10' },
  GOODS_RECEIVED: { icon: Package, color: 'text-success', bg: 'bg-success/10' },
  TRANSFER_COMPLETED: { icon: ArrowLeftRight, color: 'text-primary', bg: 'bg-primary/10' },
  BORROW_ISSUED: { icon: Laptop, color: 'text-primary', bg: 'bg-primary/10' },
  BORROW_RETURNED: { icon: RotateCcw, color: 'text-warning', bg: 'bg-warning/10' },
  DISPOSAL_COMPLETED: { icon: Trash2, color: 'text-muted', bg: 'bg-surface-alt' },
  DISTRIBUTION_CONFIRMED: { icon: Send, color: 'text-success', bg: 'bg-success/10' },
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', unreadOnly],
    queryFn: async () =>
      (
        await api.get<{ data: Notification[] }>('/notifications', {
          params: unreadOnly ? { unreadOnly: true } : undefined,
        })
      ).data.data,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={
          isLoading
            ? 'Loading...'
            : unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
              : 'You are all caught up'
        }
        actions={
          <Button size="sm" variant="secondary" onClick={() => markAllRead.mutate()} disabled={unreadCount === 0 || markAllRead.isPending}>
            <CheckCircle2 className="h-4 w-4" /> Mark all as read
          </Button>
        }
      />

      <div className="mb-4 flex gap-1 border-b border-border">
        <button
          onClick={() => setUnreadOnly(false)}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${!unreadOnly ? 'border-primary text-primary' : 'border-transparent text-muted'}`}
        >
          All
        </button>
        <button
          onClick={() => setUnreadOnly(true)}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${unreadOnly ? 'border-primary text-primary' : 'border-transparent text-muted'}`}
        >
          Unread only
        </button>
      </div>

      <div className="space-y-3">
        {isLoading && <p className="py-8 text-center text-sm text-muted">Loading notifications…</p>}
        {notifications?.length === 0 && (
          <Card>
            <EmptyState icon={Bell} title="No notifications" description="We'll let you know when something needs your attention." />
          </Card>
        )}
        {notifications &&
          notifications.length > 0 &&
          notifications.map((notification) => {
            const config = TYPE_MAPPING[notification.type] || {
              icon: Bell,
              color: 'text-primary',
              bg: 'bg-primary/10',
            };
            const Icon = config.icon;

            return (
              <Card
                key={notification.id}
                className={cn('cursor-pointer transition-colors hover:border-primary/50', notification.isRead ? 'opacity-70' : 'bg-surface')}
                onClick={() => {
                  if (!notification.isRead) markRead.mutate(notification.id);
                }}
              >
                <div className="flex items-start gap-4 p-4">
                  <div className={cn('mt-1 shrink-0 rounded-full p-2', config.bg, config.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className={cn('text-sm', notification.isRead ? 'font-medium text-ink' : 'font-semibold text-ink')}>
                        {notification.title}
                      </h3>
                      <span className="shrink-0 text-xs text-muted">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className={cn('mt-1 text-sm', notification.isRead ? 'text-muted' : 'text-ink/80')}>
                      {notification.body}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        markRead.mutate(notification.id);
                      }}
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
      </div>
    </div>
  );
}
