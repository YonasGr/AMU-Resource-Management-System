import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users as UsersIcon, Edit2, Check, X } from 'lucide-react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input, Select, Label } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';

interface UserRoleAssignment {
  role: { id: string; name: string; code: string };
}

interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  status: string;
  organizationId: string;
  organization?: { id: string; name: string };
  userRoles: UserRoleAssignment[];
}

interface Role {
  id: string;
  code: string;
  name: string;
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    organizationId: '',
    roleId: '',
  });

  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    organizationId: '',
    status: 'ACTIVE',
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get<{ data: User[] }>('/users')).data.data,
  });

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => (await api.get<{ data: Role[] }>('/roles')).data.data,
  });

  const { data: orgTree } = useQuery({
    queryKey: ['org-directory'],
    queryFn: async () => (await api.get<{ data: any }>('/organization-units/tree')).data.data,
  });

  const flattenOrgs = (nodes: any[], depth = 0): { id: string; name: string; depth: number }[] => {
    if (!nodes) return [];
    const list = Array.isArray(nodes) ? nodes : [nodes];
    let result: { id: string; name: string; depth: number }[] = [];
    for (const node of list) {
      result.push({ id: node.id, name: node.name, depth });
      if (node.children && node.children.length > 0) {
        result = result.concat(flattenOrgs(node.children, depth + 1));
      }
    }
    return result;
  };

  const orgs = orgTree ? flattenOrgs(orgTree) : [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const createdUser = (await api.post<{ data: User }>('/users', {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
        organizationId: form.organizationId,
      })).data.data;

      if (form.roleId) {
        await api.post('/user-roles', {
          userId: createdUser.id,
          roleId: form.roleId,
          scopeType: 'ORGANIZATION',
          scopeId: form.organizationId,
        });
      }
      return createdUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowCreate(false);
      setForm({ fullName: '', email: '', phone: '', password: '', organizationId: '', roleId: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingUser) return;
      await api.patch(`/users/${editingUser.id}`, {
        fullName: editForm.fullName,
        email: editForm.email,
        phone: editForm.phone || undefined,
        organizationId: editForm.organizationId,
        status: editForm.status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
    },
  });

  const startEdit = (user: User) => {
    setEditingUser(user);
    setEditForm({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || '',
      organizationId: user.organizationId,
      status: user.status || 'ACTIVE',
    });
  };

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const q = search.toLowerCase();
    return users.filter((u) => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, search]);

  const field = (name: keyof typeof form, value: string) => setForm((curr) => ({ ...curr, [name]: value }));

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage system users, initial roles, and organization unit assignments."
        actions={
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="h-4 w-4" /> {showCreate ? 'Cancel' : 'Create User'}
          </Button>
        }
      />

      {showCreate && (
        <Card className="mb-6 border-primary/30 shadow-md">
          <CardHeader className="font-semibold text-primary">Create New User Account</CardHeader>
          <CardBody className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Full Name *</Label>
              <Input placeholder="e.g. Abebe Bikila" value={form.fullName} onChange={(e) => field('fullName', e.target.value)} />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" placeholder="user@amu.edu.et" value={form.email} onChange={(e) => field('email', e.target.value)} />
            </div>
            <div>
              <Label>Phone (optional)</Label>
              <Input type="tel" placeholder="+251911..." value={form.phone} onChange={(e) => field('phone', e.target.value)} />
            </div>
            <div>
              <Label>Password *</Label>
              <Input type="password" placeholder="••••••••" value={form.password} onChange={(e) => field('password', e.target.value)} />
            </div>
            <div>
              <Label>Organization Unit *</Label>
              <Select value={form.organizationId} onChange={(e) => field('organizationId', e.target.value)}>
                <option value="">Select an organization unit…</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {'\u00A0'.repeat(o.depth * 3)}
                    {o.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Initial Role (optional)</Label>
              <Select value={form.roleId} onChange={(e) => field('roleId', e.target.value)}>
                <option value="">Select initial role…</option>
                {roles?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-2 flex items-center gap-3 mt-2">
              <Button
                disabled={!form.fullName || !form.email || !form.password || !form.organizationId || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                Save User Account
              </Button>
              {createMutation.isError && (
                <p className="text-sm text-danger font-medium">
                  {(createMutation.error as any)?.response?.data?.message ?? 'Failed to create user.'}
                </p>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {editingUser && (
        <Card className="mb-6 border-accent/40 bg-accent/5">
          <CardHeader className="flex items-center justify-between font-semibold text-accent">
            <span>Edit User — {editingUser.fullName}</span>
            <button onClick={() => setEditingUser(null)} className="text-muted hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          </CardHeader>
          <CardBody className="grid gap-4 md:grid-cols-2 text-sm">
            <div>
              <Label>Full Name</Label>
              <Input value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <div>
              <Label>Account Status</Label>
              <Select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Organization Unit</Label>
              <Select value={editForm.organizationId} onChange={(e) => setEditForm({ ...editForm, organizationId: e.target.value })}>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {'\u00A0'.repeat(o.depth * 3)}
                    {o.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <Button size="sm" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate()}>
                <Check className="h-4 w-4" /> Save Changes
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              {updateMutation.isError && (
                <p className="text-xs text-danger">
                  {(updateMutation.error as any)?.response?.data?.message ?? 'Failed to update user.'}
                </p>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="font-medium text-ink">User Directory</div>
          <Input
            type="search"
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </CardHeader>
        {isLoading && <p className="py-8 text-center text-sm text-muted">Loading user directory…</p>}
        {users?.length === 0 && (
          <EmptyState icon={UsersIcon} title="No users found" description="Create your first user using the button above." />
        )}
        {users && users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-subtle text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Name & Email</th>
                  <th className="px-5 py-3 font-medium">Organization Unit</th>
                  <th className="px-5 py-3 font-medium">Assigned Roles</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-surface-alt">
                    <td className="px-5 py-3">
                      <div className="font-medium text-ink">{user.fullName}</div>
                      <div className="text-xs text-muted">{user.email}</div>
                      {user.phone && <div className="text-xs text-muted">{user.phone}</div>}
                    </td>
                    <td className="px-5 py-3 text-ink font-medium">{user.organization?.name || '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {user.userRoles?.length > 0 ? (
                          user.userRoles.map((ur, idx) => (
                            <Badge key={idx} tone="accent" className="text-[11px]">
                              {ur.role.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted">No roles assigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={user.status === 'ACTIVE' ? 'success' : 'neutral'}>
                        {user.status || 'ACTIVE'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(user)}>
                        <Edit2 className="h-3.5 w-3.5" /> Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && search && (
              <p className="py-8 text-center text-sm text-muted">No users match "{search}".</p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
