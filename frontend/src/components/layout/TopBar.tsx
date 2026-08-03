import { ChevronRight, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { useMyOrgPath } from '../../hooks/useMyOrgPath';

/**
 * The org path breadcrumb is this app's signature element: every screen
 * nests under the organization hierarchy, so this pill keeps that hierarchy
 * visibly present at all times, wherever you are in the system.
 */
export function TopBar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clearSession = useAuthStore((s) => s.clearSession);
  const { data: orgPath } = useMyOrgPath();

  const handleLogout = async () => {
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken }).catch(() => undefined);
    }
    clearSession();
    // Query keys (['stores'], ['my-pending-approvals'], ...) aren't scoped
    // by user id, so without this, logging in as a different account in the
    // same tab can briefly show the previous account's cached data —
    // clearing on every logout means there's never anything to leak.
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
