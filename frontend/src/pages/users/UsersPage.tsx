import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { ShieldAlert, UserPlus, ShieldCheck, History } from 'lucide-react';

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('password123');
  const [role, setRole] = useState<'ADMINISTRATOR' | 'STORE_MANAGER' | 'STOREKEEPER' | 'AUDITOR' | 'REQUESTER'>('STOREKEEPER');

  // Queries
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data.data ?? res.data;
    },
  });

  const { data: auditLogs, isLoading: loadingAudit } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const res = await api.get('/audit');
      return res.data.data ?? res.data;
    },
  });

  // Create User Mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/users', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      resetForm();
    },
  });

  // Update Role Mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const res = await api.patch(`/users/${id}`, { role });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setPassword('password123');
    setRole('STOREKEEPER');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate({
      fullName,
      email,
      phone: phone || undefined,
      password,
      role,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-indigo-600" /> User & Role Management & Audit Trail
          </h1>
          <p className="text-sm text-slate-500">
            User registration, role assignment (Admin, Manager, Keeper, Auditor, Requester), and system audit logs
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-colors"
        >
          <UserPlus className="h-4 w-4" /> Create User Account
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 flex items-center gap-2 transition-colors ${
            activeTab === 'users'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="h-4 w-4" /> System Users ({users?.length ?? 0})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 flex items-center gap-2 transition-colors ${
            activeTab === 'audit'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="h-4 w-4" /> System Audit Trail Logs ({auditLogs?.length ?? 0})
        </button>
      </div>

      {/* Views */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        {activeTab === 'users' && (
          <div>
            {loadingUsers ? (
              <div className="py-8 text-center text-sm text-slate-500">Loading users...</div>
            ) : (
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">User Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">System Role</th>
                    <th className="px-6 py-4">Department</th>
                    <th className="px-6 py-4 text-right">Change Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users?.map((u: any) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-semibold text-slate-900">{u.fullName}</td>
                      <td className="px-6 py-4 text-slate-600">{u.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                            u.role === 'ADMINISTRATOR'
                              ? 'bg-purple-100 text-purple-700'
                              : u.role === 'STORE_MANAGER'
                              ? 'bg-indigo-100 text-indigo-700'
                              : u.role === 'STOREKEEPER'
                              ? 'bg-emerald-100 text-emerald-700'
                              : u.role === 'AUDITOR'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {u.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">{u.department?.name || 'Central Store'}</td>
                      <td className="px-6 py-4 text-right">
                        <select
                          value={u.role}
                          onChange={(e) => updateRoleMutation.mutate({ id: u.id, role: e.target.value })}
                          className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-800 focus:outline-none"
                        >
                          <option value="ADMINISTRATOR">ADMINISTRATOR</option>
                          <option value="STORE_MANAGER">STORE_MANAGER</option>
                          <option value="STOREKEEPER">STOREKEEPER</option>
                          <option value="AUDITOR">AUDITOR</option>
                          <option value="REQUESTER">REQUESTER</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'audit' && (
          <div>
            {loadingAudit ? (
              <div className="py-8 text-center text-sm text-slate-500">Loading audit trail...</div>
            ) : (
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Module</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs?.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {log.user?.fullName || 'System'}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-indigo-600">{log.module}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{log.action}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{log.details || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Create System User Account</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Abebe Kebede"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="user@store.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+251..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:outline-none"
                  >
                    <option value="STORE_MANAGER">Store Manager</option>
                    <option value="STOREKEEPER">Storekeeper</option>
                    <option value="AUDITOR">Auditor</option>
                    <option value="ADMINISTRATOR">Administrator</option>
                    <option value="REQUESTER">Requester</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  Save User Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
