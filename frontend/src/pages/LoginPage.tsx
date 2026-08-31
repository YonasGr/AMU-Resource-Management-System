import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  Lock,
  Mail,
  User,
  Shield,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  KeyRound,
  UserPlus,
  Building,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { Button } from '../components/ui/Button';

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
    { label: 'Store Manager', email: 'manager@store.com', role: 'Approval & Catalog Control', badge: 'Manager' },
    { label: 'Storekeeper', email: 'keeper@store.com', role: 'Stock In/Out & Issuance', badge: 'Keeper' },
    { label: 'Requester (Academic Staff)', email: 'requester@store.com', role: 'Department Material Requisitions', badge: 'Requester' },
    { label: 'Internal Auditor', email: 'auditor@store.com', role: 'Audit Logs & Inventory Valuation', badge: 'Auditor' },
    { label: 'System Administrator', email: 'admin@store.com', role: 'User Management & Security Control', badge: 'Admin' },
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
    <div className="flex min-h-screen w-screen bg-canvas">
      {/* Left side: Enterprise Hero Showcase with Iconic Campus Background */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden border-r border-brand-800 text-white select-none">
        {/* Campus Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 transform transition-transform duration-1000"
          style={{ backgroundImage: `url('/amu-campus.jpg')` }}
        />
        
        {/* Layered Gradient & Frosted Vignette Overlays for High Legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-950/85 via-brand-950/75 to-brand-950/95 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-tr from-teal-950/50 via-transparent to-brand-900/60" />

        {/* Ambient glow accents */}
        <div className="absolute top-0 left-1/4 h-80 w-80 rounded-full bg-teal-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />

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

        {/* Center content */}
        <div className="relative z-10 space-y-6 my-auto max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/25 backdrop-blur-md px-3.5 py-1 text-xs font-bold text-teal-200 border border-teal-400/40 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-teal-300" />
            <span>Arba Minch University • Central Store Portal</span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight drop-shadow-lg">
            Institutional Resource Allocation, Material Tracking & Live Inventory Auditing.
          </h2>

          <p className="text-sm text-slate-200 leading-relaxed drop-shadow-md font-medium">
            Dedicated store operations platform connecting university academic faculties, department requisitions, supplier deliveries, and physical inventory control.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="rounded-2xl bg-brand-900/60 backdrop-blur-md p-4 border border-white/15 shadow-xl">
              <div className="flex items-center gap-2 text-teal-300 text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 className="h-4 w-4" /> Dedicated Store
              </div>
              <p className="mt-1 text-xs text-slate-300">Catalog, stock in/out, returns & transfer operations</p>
            </div>

            <div className="rounded-2xl bg-brand-900/60 backdrop-blur-md p-4 border border-white/15 shadow-xl">
              <div className="flex items-center gap-2 text-teal-300 text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 className="h-4 w-4" /> Role Governance
              </div>
              <p className="mt-1 text-xs text-slate-300">Manager approvals, keeper issuance & auditor ledger</p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-300 border-t border-white/15 pt-6 backdrop-blur-xs font-medium">
          <span>Arba Minch University &copy; 2026</span>
          <span className="flex items-center gap-1.5 text-teal-300">
            <Shield className="h-3.5 w-3.5" /> Enterprise Secured
          </span>
        </div>
      </div>

      {/* Right side: Login & Quick Switcher Card */}
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
              {isRegister ? 'Create System Account' : 'Welcome to AMU Store'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {isRegister
                ? 'Register your university faculty credentials'
                : 'Sign in to access your role-based store operations & requisitions'}
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

          {/* Demo Quick Account Switcher */}
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <Shield className="h-3.5 w-3.5 text-teal-600" /> Demo Quick Login Accounts:
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Click to populate</span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {quickUsers.map((u) => {
                const isSelected = email === u.email;
                return (
                  <button
                    key={u.email}
                    type="button"
                    onClick={() => handleQuickLogin(u.email)}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs text-left transition-all ${
                      isSelected
                        ? 'bg-teal-50 border border-teal-300 text-teal-900 font-bold shadow-xs'
                        : 'bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className={`h-2 w-2 rounded-full shrink-0 ${
                          isSelected ? 'bg-teal-500' : 'bg-slate-300'
                        }`}
                      />
                      <span className="truncate">{u.label}</span>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ml-2 ${
                        isSelected
                          ? 'bg-teal-100 text-teal-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {u.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

