import React, { useState } from 'react';
import { LogOut, Building2, Shield, Search, ChevronDown, User, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth.store';
import { NotificationBell } from '../notifications/NotificationBell';

export function TopBar() {
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
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/90 bg-white/95 backdrop-blur-md px-8 shadow-xs">
      {/* Left side: Context & Badges */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
          <img src="/amu-logo.png" alt="Arba Minch University Logo" className="h-6 w-6 object-contain" />
          <span className="text-xs font-extrabold text-slate-800 tracking-tight hidden lg:inline">
            Arba Minch University
          </span>
        </div>

        {/* System Role Badge */}
        {user?.role && (
          <span
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${getRoleBadgeStyle(
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
      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <NotificationBell />

        <div className="h-6 w-px bg-slate-200" />

        {/* User Profile Dropdown Pill */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-3 rounded-2xl p-1.5 pr-3 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
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


