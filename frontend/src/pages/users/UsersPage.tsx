import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users as UsersIcon } from 'lucide-react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input, Select, Label } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';

interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  status: string;
  organizationId: string;
  organization?: { name: string };
  userRoles: { role: { name: string } }[];
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    organizationId: '',
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get<{ data: User[] }>('/users')).data.data,
  });

  const { data: orgTree } = useQuery({
    queryKey: ['org-directory'],
    queryFn: async () => (await api.get<{ data: any }>('/organization')).data.data,
  });

  const flattenOrgs = (node: any, depth = 0): { id: string; name: string; depth: number }[] => {
    if (!node) return [];
    let result = [{ id: node.id, name: node.name, depth }];
    if (node.children) {
      for (const child of node.children) {
        result = result.concat(flattenOrgs(child, depth + 1));
      }
    }
    return result;
  };

  const orgs = orgTree ? flattenOrgs(orgTree) : [];

  const createMutation = useMutation({
    mutationFn: () => api.post('/users', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowCreate(false);
      setForm({ fullName: '', email: '', phone: '', password: '', organizationId: '' });
    },
  });

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
        description="Manage system users"
        actions={
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="h-4 w-4" /> {showCreate ? 'Cancel' : 'Create User'}
          </Button>
        }
      />

      {showCreate && (
        <Card className="mb-6">
          <CardHeader className="font-medium">Create New User</CardHeader>
          <CardBody className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Full Name</Label>
              <Input value={form.fullName} onChange={(e) => field('fullName', e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => field('email', e.target.value)} />
            </div>
            <div>
              <Label>Phone (optional)</Label>
              <Input type="tel" value={form.phone} onChange={(e) => field('phone', e.target.value)} />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={form.password} onChange={(e) => field('password', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Organization Unit</Label>
              <Select value={form.organizationId} onChange={(e) => field('organizationId', e.target.value)}>
                <option value="">Select an organization…</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {'\u00A0'.repeat(o.depth * 4)}
                    {o.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-2">
              <Button
                disabled={!form.fullName || !form.email || !form.password || !form.organizationId || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                Save User
              </Button>
              {createMutation.isError && (
                <p className="mt-2 text-sm text-danger">
                  {(createMutation.error as any)?.response?.data?.message ?? 'Failed to create user.'}
                </p>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="font-medium text-ink">Directory</div>
          <Input
            type="search"
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </CardHeader>
        {isLoading && <p className="py-8 text-center text-sm text-muted">Loading users…</p>}
        {users?.length === 0 && (
          <EmptyState icon={UsersIcon} title="No users found" description="Create your first user using the button above." />
        )}
        {users && users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-subtle text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Name & Email</th>
                  <th className="px-5 py-3 font-medium">Organization</th>
                  <th className="px-5 py-3 font-medium">Roles</th>
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
                    <td className="px-5 py-3 text-muted">{user.organization?.name || '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {user.userRoles?.length > 0 ? (
                          user.userRoles.map((ur, idx) => (
                            <Badge key={idx} tone="neutral" className="text-[10px]">
                              {ur.role.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={user.status === 'ACTIVE' ? 'success' : 'neutral'}>
                        {user.status || 'ACTIVE'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      {/* Deactivate logic omitted because endpoint does not exist currently */}
                      <Button variant="ghost" size="sm" disabled>
                        Edit
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
