import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Warehouse } from 'lucide-react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardBody } from '../../components/ui/Card';
import { Badge, statusTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input, Label } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';

interface Store {
  id: string;
  name: string;
  code: string;
  location?: string;
  status: string;
  organizationId: string;
}

export default function StoreListPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [organizationId, setOrganizationId] = useState('');

  const { data: stores, isLoading, error } = useQuery({
    queryKey: ['stores'],
    queryFn: async () => (await api.get<{ data: Store[] }>('/stores')).data.data,
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/stores', { name, code, organizationId }),
    onSuccess: () => {
      setName('');
      setCode('');
      setOrganizationId('');
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
  });

  return (
    <div>
      <PageHeader
        title="Stores"
        description="Every store you have access to, across every department, office, and directorate."
        actions={
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" /> New store
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-6">
          <CardBody>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CS Store" />
              </div>
              <div>
                <Label>Code</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. CS-STORE-01" />
              </div>
              <div>
                <Label>Organization unit id</Label>
                <Input
                  value={organizationId}
                  onChange={(e) => setOrganizationId(e.target.value)}
                  placeholder="uuid from Organization page"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Button
                size="sm"
                disabled={!name || !code || !organizationId || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                Create store
              </Button>
              {createMutation.isError && (
                <span className="text-sm text-danger">
                  {(createMutation.error as any)?.response?.data?.message ?? 'Could not create store.'}
                </span>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        {isLoading && <p className="py-8 text-center text-sm text-muted">Loading stores…</p>}
        {error && (
          <p className="py-8 text-center text-sm text-danger">
            Couldn't load stores. You may not have access to any yet.
          </p>
        )}
        {stores?.length === 0 && (
          <EmptyState
            icon={Warehouse}
            title="No stores in view"
            description="Either none exist yet, or your role isn't scoped to any store or organization unit."
          />
        )}
        {stores && stores.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Code</th>
                <th className="px-5 py-3 font-medium">Location</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((store) => (
                <tr key={store.id} className="border-b border-border last:border-0 hover:bg-surface-alt">
                  <td className="px-5 py-3">
                    <Link to={`/stores/${store.id}`} className="font-medium text-primary hover:underline">
                      {store.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-muted">{store.code}</td>
                  <td className="px-5 py-3 text-muted">{store.location ?? '—'}</td>
                  <td className="px-5 py-3">
                    <Badge tone={statusTone(store.status)}>{store.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
