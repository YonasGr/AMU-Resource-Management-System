import React from 'react';
import { Navigate, Outlet, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

/** Redirects to /login if unauthenticated, or displays access restricted screen if role is unauthorized. */
export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-coral-50 text-coral-600 ring-8 ring-coral-50/50">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="mt-5 text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="mt-2 text-xs text-slate-500 max-w-md leading-relaxed">
          Your current account role (<strong className="text-slate-700 uppercase">{user.role.replace('_', ' ')}</strong>) does not have clearance to view this module.
        </p>
        <div className="mt-3 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-600">
          Authorized Roles: <span className="font-bold ml-1">{allowedRoles.map((r) => r.replace('_', ' ')).join(', ')}</span>
        </div>
        <div className="mt-6 flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-xl bg-brand-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-800 transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
