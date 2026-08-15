import { LogOut, Store, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth.store';

export function TopBar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);

  const handleLogout = () => {
    clearSession();
    queryClient.clear();
    navigate('/login');
  };

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'STOREKEEPER':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'STORE_MANAGER':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'ADMINISTRATOR':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'AUDITOR':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-8 shadow-sm">
      <div className="flex items-center gap-3">
        <Store className="h-5 w-5 text-indigo-600" />
        <span className="font-semibold text-slate-800 text-sm">
          Store Management System
        </span>

        {/* System Role Badge */}
        {user?.role && (
          <span
            className={`flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-bold border ${getRoleBadgeStyle(
              user.role,
            )}`}
          >
            <Shield className="h-3 w-3" />
            {user.role.replace('_', ' ')}
          </span>
        )}

        {/* Department Badge */}
        {user?.departmentName && (
          <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-medium text-slate-600 border border-slate-200">
            Dept: {user.departmentName}
          </span>
        )}
      </div>

      <div className="flex items-center gap-5">
        <div className="text-right">
          <p className="text-sm font-semibold leading-tight text-slate-900">{user?.fullName}</p>
          <p className="text-xs text-slate-500">{user?.email}</p>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </header>
  );
}
