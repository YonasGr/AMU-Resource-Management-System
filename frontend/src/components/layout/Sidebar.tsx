import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FileText,
  Repeat,
  Users,
  Building,
  BarChart3,
  ShieldAlert,
  LogOut,
  Boxes,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '../../lib/cn';
import { useAuthStore } from '../../store/auth.store';
import { api } from '../../lib/api';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: string;
  badgeTone?: 'coral' | 'amber';
  roles: string[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export function Sidebar() {
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const navigate = useNavigate();

  // Fetch quick counts for sidebar badges
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/dashboard/stats');
      return res.data.data ?? res.data;
    },
    staleTime: 30000,
  });

  const pendingRequestsCount = stats?.overview?.pendingRequests ?? 0;
  const lowStockCount = stats?.overview?.lowStockCount ?? 0;

  const navGroups: NavGroup[] = [
    {
      label: 'Core Operations',
      items: [
        {
          to: '/',
          label: 'Overview Dashboard',
          icon: LayoutDashboard,
          end: true,
          roles: ['ADMINISTRATOR', 'STORE_MANAGER', 'STOREKEEPER', 'AUDITOR', 'REQUESTER'],
        },
        {
          to: '/materials',
          label: 'Material Catalog',
          icon: Package,
          badge: lowStockCount > 0 ? `${lowStockCount} alert` : undefined,
          badgeTone: 'coral',
          roles: ['ADMINISTRATOR', 'STORE_MANAGER', 'STOREKEEPER', 'AUDITOR', 'REQUESTER'],
        },
        {
          to: '/requests',
          label: 'Material Requests',
          icon: FileText,
          badge: pendingRequestsCount > 0 ? `${pendingRequestsCount}` : undefined,
          badgeTone: 'amber',
          roles: ['ADMINISTRATOR', 'STORE_MANAGER', 'STOREKEEPER', 'AUDITOR', 'REQUESTER'],
        },
      ],
    },
    {
      label: 'Inventory Control',
      items: [
        {
          to: '/inventory',
          label: 'Inventory Operations',
          icon: Repeat,
          roles: ['STOREKEEPER', 'STORE_MANAGER', 'AUDITOR'],
        },
      ],
    },
    {
      label: 'Organization',
      items: [
        {
          to: '/employees',
          label: 'Employees & Depts',
          icon: Users,
          roles: ['ADMINISTRATOR', 'STORE_MANAGER', 'STOREKEEPER', 'AUDITOR'],
        },
        {
          to: '/suppliers',
          label: 'Suppliers & Vendors',
          icon: Building,
          roles: ['ADMINISTRATOR', 'STORE_MANAGER'],
        },
      ],
    },
    {
      label: 'Governance & Reports',
      items: [
        {
          to: '/reports',
          label: 'Reports & Analytics',
          icon: BarChart3,
          roles: ['ADMINISTRATOR', 'STORE_MANAGER', 'STOREKEEPER', 'AUDITOR'],
        },
        {
          to: '/users',
          label: 'Admin & Backup Controls',
          icon: ShieldAlert,
          roles: ['ADMINISTRATOR'],
        },
      ],
    },
  ];

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  const userInitials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'AM';

  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col bg-brand-900 text-slate-200 border-r border-brand-800/80 shadow-xl select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-brand-800/80">
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white p-1 shadow-md shadow-teal-500/20 ring-2 ring-teal-400/30 overflow-hidden shrink-0">
            <img src="/amu-logo.png" alt="Arba Minch University Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base text-white tracking-tight leading-none">
                AMU STORE
              </span>
              <span className="inline-flex items-center rounded-full bg-teal-500/20 px-1.5 py-0.5 text-[9px] font-bold text-teal-300">
                OFFICIAL
              </span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-400 leading-tight">
              Arba Minch University
            </p>
          </div>
        </div>
      </div>

      {/* User Info Card */}
      {user && (
        <div className="mx-4 mt-4 p-3.5 rounded-2xl bg-brand-800/70 border border-brand-700/60 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-600 text-white text-xs font-bold ring-2 ring-brand-700">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{user.fullName}</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="inline-flex items-center rounded-full bg-teal-500/20 px-2 py-0.5 text-[10px] font-bold text-teal-300 uppercase tracking-wide">
                  {user.role.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nav groups */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
        {navGroups.map((group, gIdx) => {
          const visibleItems = group.items.filter(
            (item) => !user?.role || item.roles.includes(user.role),
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={gIdx} className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400/90 mb-1.5">
                {group.label}
              </p>
              {visibleItems.map(({ to, label, icon: Icon, end, badge, badgeTone }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150',
                      isActive
                        ? 'bg-teal-500/15 text-white border-l-3 border-teal-400 shadow-xs shadow-teal-500/10'
                        : 'text-slate-300 hover:bg-brand-800/80 hover:text-white',
                    )
                  }
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon className="h-4 w-4 shrink-0 transition-colors group-hover:text-teal-300" strokeWidth={2} />
                    <span className="truncate">{label}</span>
                  </div>

                  {badge && (
                    <span
                      className={cn(
                        'ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0',
                        badgeTone === 'coral'
                          ? 'bg-coral-500/20 text-coral-300 border border-coral-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
                      )}
                    >
                      {badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer */}
      <div className="p-3.5 border-t border-brand-800/80 bg-brand-950/40">
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-800/60 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-coral-500/20 hover:text-coral-300 hover:border-coral-500/30 border border-brand-700/50 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

