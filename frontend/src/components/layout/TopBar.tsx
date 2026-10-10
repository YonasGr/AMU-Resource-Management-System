import React, { useState } from 'react';
import { LogOut, Building2, Shield, ChevronDown, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth.store';
import { NotificationBell } from '../notifications/NotificationBell';

export function TopBar({ onMenuClick, navigationOpen = false }: { onMenuClick?: () => void; navigationOpen?: boolean }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    clearSession();
    queryClient.clear();
    navigate('/login');
  };

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'STOREKEEPER':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'STORE_MANAGER':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'ADMINISTRATOR':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'AUDITOR':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-sky-50 text-sky-700 border-sky-200';
    }
  };

  const userInitials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200/90 bg-white/95 px-3 shadow-xs backdrop-blur-md sm:h-16 sm:px-6 lg:px-8">
      {/* Left side: Context & Badges */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button type="button" aria-label="Open navigation" aria-controls="primary-navigation" aria-expanded={navigationOpen} onClick={onMenuClick} className="-ml-1 rounded-xl p-2 text-slate-700 hover:bg-slate-100 focus-visible:outline-offset-2 lg:hidden">
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden items-center gap-2 border-r border-slate-200 pr-3 sm:flex">
          <img src="/amu-logo.png" alt="Arba Minch University Logo" className="h-6 w-6 object-contain" />
          <span className="hidden text-xs font-extrabold tracking-tight text-slate-800 xl:inline">
            Arba Minch University
          </span>
        </div>

        {/* System Role Badge */}
        {user?.role && (
          <span
            className={`hidden items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-bold sm:flex sm:px-3 sm:text-xs ${getRoleBadgeStyle(
              user.role,
            )}`}
          >
            <Shield className="h-3.5 w-3.5 shrink-0" />
            <span>{user.role.replace('_', ' ')}</span>
          </span>
        )}

        {/* Department Badge */}
        {user?.departmentName && (
          <span className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
            <Building2 className="h-3.5 w-3.5 text-slate-500" />
            <span>{user.departmentName}</span>
          </span>
        )}
      </div>

      {/* Right side: Actions, Notifications, Profile */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        {/* Notification Bell */}
        <NotificationBell />

        <div className="hidden h-6 w-px bg-slate-200 sm:block" />

        {/* User Profile Dropdown Pill */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
            className="flex min-h-11 items-center gap-2 rounded-2xl border border-transparent p-1.5 pr-2 transition-colors hover:border-slate-200 hover:bg-slate-100 sm:gap-3 sm:pr-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-700 to-teal-600 text-white font-bold text-xs shadow-xs">
              {userInitials}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold leading-tight text-slate-900 truncate max-w-[140px]">
                {user?.fullName}
              </p>
              <p className="text-[11px] font-medium text-slate-400 truncate max-w-[140px]">
                {user?.email}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {/* User Menu Popup */}
          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 z-50 w-56 rounded-2xl bg-white p-2 shadow-2xl border border-slate-200 animate-scale-in">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900">{user?.fullName}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                </div>

                <div className="pt-1">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-coral-600 hover:bg-coral-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
