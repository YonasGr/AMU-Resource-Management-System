import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, KeyRound, UserPlus } from 'lucide-react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input, Select, Label } from '../../components/ui/Input';
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
      setScopeId('');
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
                  selectedRole?.id === role.id ? 'bg-primary/10 text-primary' : 'hover:bg-surface-alt'
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
                {permissions
                  ?.filter((p) =>
                    selectedRole.rolePermissions?.some((rp) => rp.permission.key === p.key),
                  )
                  .map((p) => (
                    <Badge key={p.id} tone="accent">{p.key}</Badge>
                  ))}
                {selectedRole.rolePermissions?.length === 0 && (
                  <p className="text-sm text-muted">This role has no permissions assigned.</p>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Assign a role</span>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <Label>User id</Label>
              <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="user uuid" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                <option value="">Select a role…</option>
                {roles?.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Scope</Label>
              <Select value={scopeType} onChange={(e) => setScopeType(e.target.value as any)}>
                <option value="GLOBAL">Global</option>
                <option value="ORGANIZATION">Organization unit</option>
                <option value="STORE">Store</option>
              </Select>
            </div>
            <div>
              <Label>Scope id {scopeType === 'GLOBAL' && '(n/a)'}</Label>
              <Input
                value={scopeId}
                onChange={(e) => setScopeId(e.target.value)}
                disabled={scopeType === 'GLOBAL'}
                placeholder={scopeType === 'GLOBAL' ? '—' : 'org or store uuid'}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button
              size="sm"
              disabled={!userId || !roleId || (scopeType !== 'GLOBAL' && !scopeId) || assignMutation.isPending}
              onClick={() => assignMutation.mutate()}
            >
              Assign role
            </Button>
            {assignMutation.isSuccess && <span className="text-sm text-success">Assigned.</span>}
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
