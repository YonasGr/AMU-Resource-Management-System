import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { Store, UserCheck, Shield, KeyRound, UserPlus } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('manager@store.com');
  const [password, setPassword] = useState('password123');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const quickUsers = [
    { label: 'Store Manager', email: 'manager@store.com', role: 'Approval & Control' },
    { label: 'Storekeeper', email: 'keeper@store.com', role: 'Stock In/Out Ops' },
    { label: 'Requester (Lecturer)', email: 'requester@store.com', role: 'Item Requests' },
    { label: 'Auditor', email: 'auditor@store.com', role: 'Reports & Logs' },
    { label: 'Administrator', email: 'admin@store.com', role: 'User Management' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const res = await api.post('/auth/register', {
          fullName,
          email,
          password,
        });
        setSession(res.data.data || res.data);
      } else {
        const res = await api.post('/auth/login', { email, password });
        setSession(res.data.data || res.data);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (userEmail: string) => {
    setEmail(userEmail);
    setPassword('password123');
    setIsRegister(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-slate-800 p-8 shadow-2xl border border-slate-700">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
            <Store className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-white tracking-tight">
            Store Management System
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {isRegister ? 'Create a Requester account' : 'Sign in to access store portal'}
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-rose-500/10 p-3 text-xs font-semibold text-rose-400 border border-rose-500/20 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Dr. Abebe Kebede"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@store.com"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 focus:outline-none transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : isRegister ? 'Register Account' : 'Sign In'}
          </button>
        </form>

        <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-700/60 pt-4">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-indigo-400 hover:underline font-medium flex items-center gap-1"
          >
            {isRegister ? <KeyRound className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
            {isRegister ? 'Already have an account? Sign in' : 'Need an account? Register here'}
          </button>
        </div>

        {/* Demo Quick Account Switcher */}
        <div className="mt-6 rounded-xl bg-slate-900/80 p-4 border border-slate-700/60">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">
            <Shield className="h-3.5 w-3.5" /> Demo Quick Login Accounts:
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {quickUsers.map((u) => (
              <button
                key={u.email}
                type="button"
                onClick={() => handleQuickLogin(u.email)}
                className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-xs text-left transition-colors ${
                  email === u.email
                    ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/40'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                  {u.label}
                </span>
                <span className="text-[10px] text-slate-500">{u.role}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
