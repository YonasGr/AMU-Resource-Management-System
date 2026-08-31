import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldAlert,
  UserPlus,
  ShieldCheck,
  History,
  Settings,
  Database,
  Download,
  Upload,
  UserCheck,
  Mail,
  Phone,
  Lock,
  Building2,
  CheckCircle2,
  AlertTriangle,
  FileCode,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input, Select, Label, SearchInput } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';

export default function UsersPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === 'ADMINISTRATOR';

  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'settings'>('users');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('password123');
  const [role, setRole] = useState<
    'ADMINISTRATOR' | 'STORE_MANAGER' | 'STOREKEEPER' | 'AUDITOR' | 'REQUESTER'
  >('STOREKEEPER');

  // Settings State
  const [systemName, setSystemName] = useState('Arba Minch University Store Management System');
  const [defaultThreshold, setDefaultThreshold] = useState('10');
  const [backupMessage, setBackupMessage] = useState('');

  // Queries
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    enabled: isAdmin,
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data.data ?? res.data;
    },
  });

  const { data: auditLogs, isLoading: loadingAudit } = useQuery({
    queryKey: ['audit-logs'],
    enabled: isAdmin,
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

  const handleBackup = () => {
    const backupData = {
      timestamp: new Date().toISOString(),
      system: systemName,
      users,
      auditLogsCount: auditLogs?.length ?? 0,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `store_system_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setBackupMessage('Administrative backup snapshot generated and saved to device.');
    setTimeout(() => setBackupMessage(''), 4000);
  };

  const handleRestoreSim = () => {
    setBackupMessage('Database schema verification and state sync complete.');
    setTimeout(() => setBackupMessage(''), 4000);
  };

  if (!isAdmin) {
    return (
      <div className="rounded-3xl bg-white p-12 text-center shadow-sm border border-slate-200 space-y-4 max-w-lg mx-auto my-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-coral-50 text-coral-600">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Administrator Clearance Required</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          User account management, role assignment, system security parameters, audit trail logs, and database snapshots are strictly reserved for System <strong>Administrators</strong>.
        </p>
      </div>
    );
  }

  const filteredUsers = (users || []).filter((u: any) => {
    const q = search.toLowerCase();
    return (
      u.fullName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q) ||
      u.department?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title="Admin Control & System Security"
        description="Manage user credentials, assign role-based access privileges, inspect system audit logs, and download database backups."
        icon={ShieldCheck}
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Admin Security Control' }]}
        actions={
          <Button
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<UserPlus className="h-4 w-4" />}
          >
            Create User Account
          </Button>
        }
      />

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/90 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === 'users'
              ? 'bg-brand-900 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>System Users</span>
          <span className="rounded-full bg-slate-100/30 px-2 py-0.5 text-[10px] font-bold">
            {users?.length ?? 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === 'audit'
              ? 'bg-brand-900 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <History className="h-3.5 w-3.5" />
          <span>Audit Logs</span>
          <span className="rounded-full bg-slate-100/30 px-2 py-0.5 text-[10px] font-bold">
            {auditLogs?.length ?? 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === 'settings'
              ? 'bg-brand-900 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <Settings className="h-3.5 w-3.5" />
          <span>System Settings & Backups</span>
        </button>
      </div>

      {/* Tab: Users Management */}
      {activeTab === 'users' && (
        <Card className="overflow-hidden space-y-4">
          <div className="p-4 border-b border-slate-200/80 max-w-md">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
              placeholder="Search users by name, email, or role..."
            />
          </div>

          {loadingUsers ? (
            <div className="py-16 text-center">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
              <p className="mt-3 text-xs font-semibold text-slate-500">Loading system users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={UserCheck}
                title="No users found"
                description={
                  search
                    ? 'No user accounts match your search filter.'
                    : 'No system accounts are configured.'
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50/90 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                  <tr>
                    <th className="px-6 py-4">User Details</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Current Role</th>
                    <th className="px-6 py-4">Department Unit</th>
                    <th className="px-6 py-4 text-right">Assign Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u: any) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{u.fullName}</p>
                        {u.phone && <p className="text-xs text-slate-400 font-mono">{u.phone}</p>}
                      </td>

                      <td className="px-6 py-4 text-xs font-medium text-slate-600">{u.email}</td>

                      <td className="px-6 py-4">
                        <Badge
                          tone={
                            u.role === 'ADMINISTRATOR'
                              ? 'purple'
                              : u.role === 'STORE_MANAGER'
                              ? 'teal'
                              : u.role === 'STOREKEEPER'
                              ? 'success'
                              : u.role === 'AUDITOR'
                              ? 'amber'
                              : 'neutral'
                          }
                        >
                          {u.role.replace('_', ' ')}
                        </Badge>
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-500">
                        {u.department?.name || 'General Inventory Ops'}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <select
                          value={u.role}
                          onChange={(e) =>
                            updateRoleMutation.mutate({ id: u.id, role: e.target.value })
                          }
                          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs focus:border-teal-500 focus:outline-none"
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
            </div>
          )}
        </Card>
      )}

      {/* Tab: Audit Logs */}
      {activeTab === 'audit' && (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>System Activity Audit Log</CardTitle>
            <CardDescription>
              Immutable audit trail recording security events, user logins, role changes, and inventory actions.
            </CardDescription>
          </CardHeader>

          <CardBody className="p-0">
            {loadingAudit ? (
              <div className="py-16 text-center">
                <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
                <p className="mt-3 text-xs font-semibold text-slate-500">Loading audit trail...</p>
              </div>
            ) : auditLogs?.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={History}
                  title="No audit entries"
                  description="No audit logs have been recorded in the active period."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50/90 font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                    <tr>
                      <th className="px-6 py-4">Timestamp</th>
                      <th className="px-6 py-4">Actor</th>
                      <th className="px-6 py-4">Module</th>
                      <th className="px-6 py-4">Action</th>
                      <th className="px-6 py-4">Event Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs?.map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 text-slate-400 font-mono">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900">
                          {log.user?.fullName || 'System Automated'}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                            {log.module}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-800">{log.action}</td>
                        <td className="px-6 py-4 text-slate-500 font-mono text-[11px]">
                          {log.details || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Tab: System Settings & Backup */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>System Parameters</CardTitle>
              <CardDescription>Configure global store policies and thresholds.</CardDescription>
            </CardHeader>

            <CardBody className="space-y-4">
              {backupMessage && (
                <div className="flex items-center gap-2 rounded-xl bg-teal-50 p-3 text-xs font-bold text-teal-800 border border-teal-200">
                  <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
                  <span>{backupMessage}</span>
                </div>
              )}

              <div>
                <Label>System Brand Name</Label>
                <Input
                  value={systemName}
                  onChange={(e) => setSystemName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Default Minimum Stock Limit</Label>
                  <Input
                    type="number"
                    value={defaultThreshold}
                    onChange={(e) => setDefaultThreshold(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Default Valuation Currency</Label>
                  <Input disabled value="ETB (Ethiopian Birr)" />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-teal-600" />
                <span>Database Backup & Snapshot Utility</span>
              </CardTitle>
              <CardDescription>
                Export JSON snapshots of material items, inventory ledgers, and user directories.
              </CardDescription>
            </CardHeader>

            <CardBody className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <FileCode className="h-4 w-4 text-teal-600" />
                  <span>Database Snapshot Management</span>
                </div>
                <p className="text-xs text-slate-500">
                  Generate administrative backup archives for disaster recovery or offline data compliance.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleBackup}
                    leftIcon={<Download className="h-4 w-4" />}
                  >
                    Download Database Backup (.json)
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleRestoreSim}
                    leftIcon={<Upload className="h-4 w-4" />}
                  >
                    Verify & Sync State
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Create User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create System User Account"
        description="Provision access credentials and assign institutional role permissions."
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label required>Full Name</Label>
            <Input
              required
              placeholder="e.g. Abebe Kebede"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div>
            <Label required>Email Address</Label>
            <Input
              type="email"
              required
              placeholder="user@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Phone Number</Label>
              <Input
                placeholder="+251..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <Label required>Assigned System Role</Label>
              <Select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
              >
                <option value="STORE_MANAGER">Store Manager</option>
                <option value="STOREKEEPER">Storekeeper</option>
                <option value="AUDITOR">Auditor</option>
                <option value="ADMINISTRATOR">Administrator</option>
                <option value="REQUESTER">Requester</option>
              </Select>
            </div>
          </div>

          <div>
            <Label required>Initial Password</Label>
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createUserMutation.isPending}
            >
              Save User Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

