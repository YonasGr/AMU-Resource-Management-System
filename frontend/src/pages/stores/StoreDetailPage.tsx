import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, UserCog } from 'lucide-react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Badge, statusTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input, Label } from '../../components/ui/Input';

interface Store {
  id: string;
  name: string;
  code: string;
  location?: string;
  status: string;
  managerId?: string;
}

export default function StoreDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [managerId, setManagerId] = useState('');

  const { data: store, isLoading, error } = useQuery({
    queryKey: ['store', id],
    queryFn: async () => (await api.get<{ data: Store }>(`/stores/${id}`)).data.data,
  });

  const assignManagerMutation = useMutation({
    mutationFn: () => api.post(`/stores/${id}/manager`, { managerId }),
    onSuccess: () => {
      setManagerId('');
      queryClient.invalidateQueries({ queryKey: ['store', id] });
    },
  });

  if (isLoading) return <p className="text-sm text-muted">Loading store…</p>;
  if (error || !store) {
    return (
      <p className="text-sm text-danger">
        Couldn't load this store. It may not exist, or you may not have access to it.
      </p>
    );
  }

  return (
    <div>
      <Link to="/stores" className="mb-4 flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to stores
      </Link>
      <PageHeader
        title={store.name}
        description={store.location ?? 'No location set'}
        actions={<Badge tone={statusTone(store.status)}>{store.status}</Badge>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="text-sm font-medium">Details</CardHeader>
          <CardBody className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Code</span>
              <span className="font-mono">{store.code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Manager id</span>
              <span className="font-mono text-xs">{store.managerId ?? 'Unassigned'}</span>
            </div>
            <div className="pt-2">
              <Link to={`/inventory?storeId=${store.id}`}>
                <Button size="sm" variant="secondary">View inventory</Button>
              </Link>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center gap-2 text-sm font-medium">
            <UserCog className="h-4 w-4 text-primary" /> Assign manager
          </CardHeader>
          <CardBody>
            <Label>User id</Label>
            <Input
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              placeholder="user uuid"
            />
            <div className="mt-3 flex items-center gap-3">
              <Button
                size="sm"
                disabled={!managerId || assignManagerMutation.isPending}
                onClick={() => assignManagerMutation.mutate()}
              >
                Assign
              </Button>
              {assignManagerMutation.isSuccess && <span className="text-sm text-success">Updated.</span>}
              {assignManagerMutation.isError && (
                <span className="text-sm text-danger">
                  {(assignManagerMutation.error as any)?.response?.data?.message ?? 'Could not assign manager.'}
                </span>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
