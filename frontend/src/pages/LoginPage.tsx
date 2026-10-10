import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  KeyRound,
  UserPlus,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { Button } from '../components/ui/Button';

export default function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <div className="flex min-h-screen w-screen bg-canvas">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden border-r border-brand-800 text-white select-none">
        {/* Campus Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 transform transition-transform duration-1000"
          style={{ backgroundImage: `url('/amu-campus.jpg')` }}
        />
        
        {/* Soft overlays keep the campus image atmospheric and the brand legible. */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-950/85 via-brand-950/75 to-brand-950/95 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-tr from-teal-950/50 via-transparent to-brand-900/60" />

        {/* Top brand */}
        <div className="relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-1.5 shadow-2xl shadow-teal-500/30 ring-4 ring-teal-400/40 shrink-0">
              <img src="/amu-logo.png" alt="Arba Minch University Logo" className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight drop-shadow-md">
                ARBA MINCH UNIVERSITY
              </h1>
              <p className="text-xs text-teal-300 font-semibold drop-shadow-sm">
                Store & Resource Management System
              </p>
            </div>
          </div>
        </div>

        {/* Minimal supporting copy */}
        <div className="relative z-10 my-auto max-w-lg py-16">
          <p className="text-sm font-medium tracking-wide text-teal-200">CENTRAL STORE PORTAL</p>
          <h2 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-white drop-shadow-lg">
            University resources, managed with clarity.
          </h2>
        </div>

        <div className="relative z-10 border-t border-white/15 pt-5 text-xs text-slate-300">
          Arba Minch University
        </div>
      </div>

      {/* Sign-in form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-16 overflow-y-auto">
        <div className="mx-auto w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white p-1 shadow-md ring-2 ring-slate-200 shrink-0">
                <img src="/amu-logo.png" alt="Arba Minch University Logo" className="h-full w-full object-contain" />
              </div>
              <div>
                <span className="font-extrabold text-slate-900 text-base leading-tight block">
                  Arba Minch University
                </span>
                <span className="text-xs font-semibold text-teal-600">
                  Store & Resource Portal
                </span>
              </div>
            </div>

            <h3 className="text-2xl font-extrabold tracking-tight text-slate-900">
              {isRegister ? 'Create an account' : 'Sign in'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {isRegister
                ? 'Register your university account.'
                : 'Access your AMU store account.'}
            </p>
          </div>

          {error && (
            <div className="rounded-xl bg-coral-50 p-3.5 text-xs font-semibold text-coral-700 border border-coral-200 text-center animate-fade-in">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Abebe Kebede"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@store.com"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              isLoading={loading}
              className="w-full mt-2"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              {isRegister ? 'Register Account' : 'Sign In to Portal'}
            </Button>
          </form>

          {/* Toggle between login & register */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors"
            >
              {isRegister ? <KeyRound className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
              <span>{isRegister ? 'Already registered? Sign in here' : 'Need an account? Register here'}</span>
            </button>
          </div>

          {/* Quick Demo Login Credentials */}
          {!isRegister && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2 text-center">
                Quick Demo Login (Click to Fill)
              </p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {[
                  { label: 'Admin', email: 'admin@store.com', pass: 'Admin#AMU2026!SecureKey' },
                  { label: 'Manager', email: 'manager@store.com', pass: 'Manager#AMU2026!StoreKey' },
                  { label: 'Storekeeper', email: 'keeper@store.com', pass: 'Keeper#AMU2026!InventoryKey' },
                  { label: 'Requester', email: 'requester@store.com', pass: 'Requester#AMU2026!StaffKey' },
                  { label: 'Auditor', email: 'auditor@store.com', pass: 'Auditor#AMU2026!AuditKey' },
                ].map((account) => (
                  <button
                    key={account.label}
                    type="button"
                    onClick={() => {
                      setEmail(account.email);
                      setPassword(account.pass);
                      setError('');
                    }}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 transition-colors"
                  >
                    {account.label}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
