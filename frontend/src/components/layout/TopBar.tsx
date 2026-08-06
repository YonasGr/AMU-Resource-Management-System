import { ChevronRight, LogOut, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { useMyOrgPath } from '../../hooks/useMyOrgPath';

export function TopBar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clearSession = useAuthStore((s) => s.clearSession);
  const { data: orgPath } = useMyOrgPath();

  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const res = await api.get<{ count: number }>('/notifications/unread-count');
      return res.data;
    },
    refetchInterval: 15000,
  });

  const handleLogout = async () => {
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken }).catch(() => undefined);
    }
    clearSession();
    queryClient.clear();
    navigate('/login');
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-white px-6">
      <div className="flex items-center gap-1.5 text-sm text-muted">
        {orgPath?.map((unit, i) => (
          <span key={unit.id} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-border" />}
            <span
              className={
                i === orgPath.length - 1
                  ? 'rounded-full bg-accent/10 px-2.5 py-1 font-medium text-accent'
                  : ''
              }
            >
              {unit.name}
            </span>
          </span>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/notifications')}
          className="relative rounded-full p-2 text-muted hover:bg-surface-alt hover:text-ink transition-colors"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          {(unreadData?.count ?? 0) > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadData?.count}
            </span>
          )}
        </button>

        <div className="text-right">
          <p className="text-sm font-medium leading-tight text-ink">{user?.fullName}</p>
          <p className="text-xs text-muted">{user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted hover:bg-surface-alt hover:text-ink"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </header>
  );
}
