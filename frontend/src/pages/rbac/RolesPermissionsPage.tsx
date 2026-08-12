import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, KeyRound, UserPlus, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Select, Label } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';

interface Role {
  id: string;
  code: string;
  name: string;
  isSystem: boolean;
  rolePermissions?: { permission: { key: string } }[];
}
interface Permission {
  id: string;
  key: string;
  description?: string;
}
interface User {
  id: string;
  fullName: string;
  email: string;
}
interface Store {
  id: string;
  name: string;
}
interface UserRoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  scopeType: string;
  scopeId?: string;
  role: { name: string; code: string };
  user?: { fullName: string; email: string };
}

export default function RolesPermissionsPage() {
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => (await api.get<{ data: Role[] }>('/roles')).data.data,
  });
  const { data: permissions } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => (await api.get<{ data: Permission[] }>('/permissions')).data.data,
  });
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get<{ data: User[] }>('/users')).data.data,
  });
  const { data: orgTree } = useQuery({
    queryKey: ['org-directory'],
    queryFn: async () => (await api.get<{ data: any }>('/organization-units/tree')).data.data,
  });
  const { data: stores } = useQuery({
    queryKey: ['stores-directory'],
    queryFn: async () => (await api.get<{ data: Store[] }>('/stores/directory')).data.data,
  });

  const flattenOrgs = (nodes: any[], depth = 0): { id: string; name: string; depth: number }[] => {
    if (!Array.isArray(nodes)) return [];
    let result: { id: string; name: string; depth: number }[] = [];
    for (const node of nodes) {
      result.push({ id: node.id, name: node.name, depth });
      if (node.children && node.children.length > 0) {
        result = result.concat(flattenOrgs(node.children, depth + 1));
      }
    }
    return result;
  };

  const orgs = Array.isArray(orgTree) ? flattenOrgs(orgTree) : orgTree ? flattenOrgs([orgTree]) : [];

  const selectedRole = roles?.find((r) => r.id === selectedRoleId) ?? roles?.[0];

  // Assign-role form state
  const [userId, setUserId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [scopeType, setScopeType] = useState<'GLOBAL' | 'ORGANIZATION' | 'STORE'>('ORGANIZATION');
  const [scopeId, setScopeId] = useState('');

  const assignMutation = useMutation({
    mutationFn: () =>
      api.post('/user-roles', {
        userId,
        roleId,
        scopeType,
        scopeId: scopeType === 'GLOBAL' ? undefined : scopeId,
      }),
    onSuccess: () => {
      setUserId('');
      setRoleId('');
      setScopeId('');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
    },
  });

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        description="What each role can do, and who currently holds it — scoped globally, to an organization unit, or to a single store."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Roles</span>
          </CardHeader>
          <CardBody className="space-y-1 p-2">
            {roles?.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRoleId(role.id)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${
                  selectedRole?.id === role.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-surface-alt'
                }`}
              >
                <span>{role.name}</span>
                {role.isSystem && <Badge tone="neutral">system</Badge>}
              </button>
            ))}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              {selectedRole ? `Permissions — ${selectedRole.name}` : 'Permissions'}
            </span>
          </CardHeader>
          <CardBody>
            {!selectedRole && <EmptyState title="No role selected" description="Pick a role on the left to see what it can do." />}
            {selectedRole && (
              <div className="flex flex-wrap gap-2">
                {selectedRole.rolePermissions && selectedRole.rolePermissions.length > 0 ? (
                  selectedRole.rolePermissions.map((rp, idx) => (
                    <Badge key={idx} tone="accent">
                      {rp.permission.key}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted">This role has all system permissions (*).</p>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Assign a Role</span>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <Label>Select User</Label>
              <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
                <option value="">Choose a user…</option>
                {users?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.email})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Select Role</Label>
              <Select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                <option value="">Choose a role…</option>
                {roles?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Scope Type</Label>
              <Select value={scopeType} onChange={(e) => setScopeType(e.target.value as any)}>
                <option value="GLOBAL">Global (System Wide)</option>
                <option value="ORGANIZATION">Organization Unit</option>
                <option value="STORE">Store</option>
              </Select>
            </div>
            <div>
              <Label>Scope Target {scopeType === 'GLOBAL' && '(N/A)'}</Label>
              {scopeType === 'ORGANIZATION' && (
                <Select value={scopeId} onChange={(e) => setScopeId(e.target.value)}>
                  <option value="">Choose organization unit…</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {'\u00A0'.repeat(o.depth * 3)}
                      {o.name}
                    </option>
                  ))}
                </Select>
              )}
              {scopeType === 'STORE' && (
                <Select value={scopeId} onChange={(e) => setScopeId(e.target.value)}>
                  <option value="">Choose store…</option>
                  {stores?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              )}
              {scopeType === 'GLOBAL' && (
                <Select disabled value="">
                  <option value="">Global (All Units)</option>
                </Select>
              )}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button
              size="sm"
              disabled={!userId || !roleId || (scopeType !== 'GLOBAL' && !scopeId) || assignMutation.isPending}
              onClick={() => assignMutation.mutate()}
            >
              Assign Role
            </Button>
            {assignMutation.isSuccess && <span className="text-sm text-success">Role assigned successfully!</span>}
            {assignMutation.isError && (
              <span className="text-sm text-danger">
                {(assignMutation.error as any)?.response?.data?.message ?? 'Could not assign role.'}
              </span>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
