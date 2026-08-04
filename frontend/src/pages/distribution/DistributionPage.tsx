import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Send, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Badge, statusTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input, Label, Select } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';

interface Store { id: string; name: string; code: string }
interface Item { id: string; name: string }
interface Allocation {
  id: string; itemId: string; destinationStoreId: string; quantity: number; status: string;
  item: Item; destinationStore: Store;
}
interface Plan { id: string; planNumber: string; status: string; sourceStore: Store; allocations: Allocation[] }
const message = (error: unknown) => (error as any)?.response?.data?.message ?? 'Operation failed.';

export default function DistributionPage() {
  const queryClient = useQueryClient();
  const [showBuilder, setShowBuilder] = useState(false);
  const [planNumber, setPlanNumber] = useState('');
  const [sourceStoreId, setSourceStoreId] = useState('');
  const [allocations, setAllocations] = useState([{ itemId: '', destinationStoreId: '', quantity: '' }]);

  const plans = useQuery({
    queryKey: ['distribution-plans'],
    queryFn: async () => (await api.get<{ data: Plan[] }>('/distribution-plans')).data.data,
  });
  const stores = useQuery({
    queryKey: ['stores-directory'],
    queryFn: async () => (await api.get<{ data: Store[] }>('/stores/directory')).data.data,
  });
  const items = useQuery({
    queryKey: ['items-for-distribution'],
    queryFn: async () => (await api.get<{ data: Item[] }>('/items')).data.data,
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['distribution-plans'] });
    queryClient.invalidateQueries({ queryKey: ['store-inventory'] });
  };
  const create = useMutation({
    mutationFn: () => api.post('/distribution-plans', {
      planNumber, sourceStoreId,
      allocations: allocations.map((line) => ({
        itemId: line.itemId, destinationStoreId: line.destinationStoreId, quantity: Number(line.quantity),
      })),
    }),
    onSuccess: () => {
      setPlanNumber(''); setSourceStoreId('');
      setAllocations([{ itemId: '', destinationStoreId: '', quantity: '' }]);
      setShowBuilder(false); refresh();
    },
  });
  const activate = useMutation({ mutationFn: (id: string) => api.post(`/distribution-plans/${id}/activate`), onSuccess: refresh });
  const confirm = useMutation({ mutationFn: (id: string) => api.post(`/distribution-plans/allocations/${id}/confirm`), onSuccess: refresh });

  return <div>
    <PageHeader
      title="Distribution"
      description="Allocate centrally received stock and track confirmation at every destination store."
      actions={<Button size="sm" onClick={() => setShowBuilder((value) => !value)}><Plus className="h-4 w-4" /> New plan</Button>}
    />
    {showBuilder && <Card className="mb-6"><CardHeader><h2 className="font-medium">Distribution plan builder</h2></CardHeader><CardBody>
      <div className="grid gap-3 sm:grid-cols-2"><div><Label>Plan number</Label><Input value={planNumber} onChange={(e) => setPlanNumber(e.target.value)} /></div><div><Label>Central source store</Label><Select value={sourceStoreId} onChange={(e) => setSourceStoreId(e.target.value)}><option value="">Select…</option>{stores.data?.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</Select></div></div>
      <div className="mt-4 space-y-2">{allocations.map((line, index) => <div key={index} className="grid grid-cols-[1fr_1fr_8rem_auto] gap-2">
        <Select value={line.itemId} onChange={(e) => setAllocations((rows) => rows.map((row, i) => i === index ? { ...row, itemId: e.target.value } : row))}><option value="">Item…</option>{items.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
        <Select value={line.destinationStoreId} onChange={(e) => setAllocations((rows) => rows.map((row, i) => i === index ? { ...row, destinationStoreId: e.target.value } : row))}><option value="">Destination…</option>{stores.data?.filter((store) => store.id !== sourceStoreId).map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</Select>
        <Input type="number" min="1" placeholder="Quantity" value={line.quantity} onChange={(e) => setAllocations((rows) => rows.map((row, i) => i === index ? { ...row, quantity: e.target.value } : row))} />
        <Button variant="ghost" disabled={allocations.length === 1} onClick={() => setAllocations((rows) => rows.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button>
      </div>)}</div>
      <div className="mt-3 flex gap-2"><Button variant="secondary" size="sm" onClick={() => setAllocations((rows) => [...rows, { itemId: '', destinationStoreId: '', quantity: '' }])}><Plus className="h-4 w-4" /> Add allocation</Button><Button size="sm" disabled={!planNumber || !sourceStoreId || allocations.some((line) => !line.itemId || !line.destinationStoreId || !line.quantity)} onClick={() => create.mutate()}>Save draft</Button></div>
      {create.isError && <p className="mt-2 text-sm text-danger">{message(create.error)}</p>}
    </CardBody></Card>}

    <div className="space-y-4">
      {plans.data?.length === 0 && <Card><EmptyState icon={Send} title="No distribution plans" description="Create a plan after goods have been received into the central store." /></Card>}
      {plans.data?.map((plan) => <Card key={plan.id}><CardHeader className="flex items-center justify-between"><div><h2 className="font-medium">{plan.planNumber}</h2><p className="text-xs text-muted">From {plan.sourceStore.name}</p></div><div className="flex items-center gap-2"><Badge tone={statusTone(plan.status)}>{plan.status}</Badge>{plan.status === 'DRAFT' && <Button size="sm" disabled={activate.isPending} onClick={() => activate.mutate(plan.id)}>Activate</Button>}</div></CardHeader><CardBody>
        <div className="space-y-2">{plan.allocations.map((line) => <div key={line.id} className="flex items-center justify-between rounded-md border border-border p-3"><div><p className="text-sm font-medium">{line.item.name} · {line.quantity}</p><p className="text-xs text-muted">Destination: {line.destinationStore.name}</p></div><div className="flex items-center gap-2"><Badge tone={statusTone(line.status)}>{line.status}</Badge>{plan.status === 'ACTIVE' && line.status === 'PENDING' && <Button size="sm" disabled={confirm.isPending} onClick={() => confirm.mutate(line.id)}>Confirm receipt</Button>}</div></div>)}</div>
      </CardBody></Card>)}
      {(activate.isError || confirm.isError) && <p className="text-sm text-danger">{message(activate.error ?? confirm.error)}</p>}
    </div>
  </div>;
}
