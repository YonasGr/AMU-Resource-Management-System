import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { TriangleAlert, ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal, History } from 'lucide-react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';

interface Store {
  id: string;
  name: string;
}
interface StoreInventoryRow {
  id: string;
  quantity: number;
  minimumStock: number;
  item: { id: string; name: string; unit: string };
}
interface Movement {
  id: string;
  quantity: number;
  movementType: string;
  createdAt: string;
  item: { name: string };
  fromStore?: { name: string } | null;
  toStore?: { name: string } | null;
  createdBy: { fullName: string };
}

const MOVEMENT_TONE: Record<string, 'success' | 'danger' | 'warning' | 'neutral'> = {
  PURCHASE_RECEIVE: 'success',
  RETURN: 'success',
  TRANSFER_IN: 'success',
  ISSUE: 'danger',
  DISPOSAL: 'danger',
  TRANSFER_OUT: 'danger',
  ADJUSTMENT: 'warning',
};

function QuickAction({
  storeId,
  itemId,
  onDone,
}: {
  storeId: string;
  itemId: string;
  onDone: () => void;
}) {
  const [action, setAction] = useState<'receive' | 'issue' | 'adjust' | null>(null);
  const [quantity, setQuantity] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      api.post(`/inventory/movements/${action}`, {
        itemId,
        storeId,
        quantity: Number(quantity),
      }),
    onSuccess: () => {
      setAction(null);
      setQuantity('');
      onDone();
    },
  });

  if (!action) {
    return (
      <div className="flex gap-1">
        <button title="Receive" onClick={() => setAction('receive')} className="rounded p-1.5 text-success hover:bg-success/10">
          <ArrowDownToLine className="h-3.5 w-3.5" />
        </button>
        <button title="Issue" onClick={() => setAction('issue')} className="rounded p-1.5 text-danger hover:bg-danger/10">
          <ArrowUpFromLine className="h-3.5 w-3.5" />
        </button>
        <button title="Adjust" onClick={() => setAction('adjust')} className="rounded p-1.5 text-accent hover:bg-accent/10">
          <SlidersHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="number"
        className="w-20 py-1"
        placeholder={action === 'adjust' ? '+/-' : 'qty'}
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        autoFocus
      />
      <Button size="sm" disabled={!quantity || mutation.isPending} onClick={() => mutation.mutate()}>
        {action === 'receive' ? 'Receive' : action === 'issue' ? 'Issue' : 'Adjust'}
      </Button>
      <button className="text-xs text-muted hover:text-ink" onClick={() => setAction(null)}>
        Cancel
      </button>
      {mutation.isError && (
        <span className="text-xs text-danger">
          {(mutation.error as any)?.response?.data?.message ?? 'Failed'}
        </span>
      )}
    </div>
  );
}

export default function InventoryDashboardPage() {
  const [searchParams] = useSearchParams();
  const [storeId, setStoreId] = useState(searchParams.get('storeId') ?? '');
  const [tab, setTab] = useState<'stock' | 'movements'>('stock');
  const queryClient = useQueryClient();

  const { data: stores } = useQuery({
    queryKey: ['stores-for-inventory'],
    queryFn: async () => (await api.get<{ data: Store[] }>('/stores')).data.data,
  });

  const effectiveStoreId = storeId || stores?.[0]?.id || '';

  const { data: stock, isLoading: stockLoading } = useQuery({
    queryKey: ['store-inventory', effectiveStoreId],
    enabled: Boolean(effectiveStoreId),
    queryFn: async () =>
      (await api.get<{ data: StoreInventoryRow[] }>(`/inventory/stores/${effectiveStoreId}`)).data.data,
  });

  const { data: movements, isLoading: movementsLoading } = useQuery({
    queryKey: ['movements', effectiveStoreId],
    enabled: Boolean(effectiveStoreId) && tab === 'movements',
    queryFn: async () =>
      (
        await api.get<{ data: Movement[] }>('/inventory/movements', {
          params: { storeId: effectiveStoreId },
        })
      ).data.data,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['store-inventory', effectiveStoreId] });
    queryClient.invalidateQueries({ queryKey: ['movements', effectiveStoreId] });
  };

  const lowStockCount = stock?.filter((r) => r.quantity <= r.minimumStock).length ?? 0;

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Stock levels and movement history — every quantity change here traces back to a movement record."
        actions={
          <div className="w-64">
            <Select value={effectiveStoreId} onChange={(e) => setStoreId(e.target.value)}>
              {stores?.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>
        }
      />

      {lowStockCount > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-4 py-2.5 text-sm text-accent">
          <TriangleAlert className="h-4 w-4" />
          {lowStockCount} item{lowStockCount > 1 ? 's' : ''} at or below the reorder threshold at this store.
        </div>
      )}

      <div className="mb-4 flex gap-1 border-b border-border">
        <button
          onClick={() => setTab('stock')}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${tab === 'stock' ? 'border-primary text-primary' : 'border-transparent text-muted'}`}
        >
          Stock
        </button>
        <button
          onClick={() => setTab('movements')}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium ${tab === 'movements' ? 'border-primary text-primary' : 'border-transparent text-muted'}`}
        >
          <History className="h-3.5 w-3.5" /> Movement history
        </button>
      </div>

      <Card>
        {tab === 'stock' && (
          <>
            {stockLoading && <p className="py-8 text-center text-sm text-muted">Loading stock…</p>}
            {stock?.length === 0 && (
              <EmptyState title="No stock recorded" description="Nothing has been received into this store yet." />
            )}
            {stock && stock.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-5 py-3 font-medium">Item</th>
                    <th className="px-5 py-3 font-medium">Quantity</th>
                    <th className="px-5 py-3 font-medium">Reorder at</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.map((row) => (
                    <tr key={row.id} className="border-b border-border last:border-0 hover:bg-surface-alt">
                      <td className="px-5 py-3 font-medium text-ink">{row.item.name}</td>
                      <td className="px-5 py-3">
                        <span className={`font-mono ${row.quantity <= row.minimumStock ? 'font-semibold text-accent' : ''}`}>
                          {row.quantity}
                        </span>
                        <span className="ml-1 text-xs text-muted">{row.item.unit}</span>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-muted">{row.minimumStock}</td>
                      <td className="px-5 py-3">
                        <QuickAction storeId={effectiveStoreId} itemId={row.item.id} onDone={refresh} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {tab === 'movements' && (
          <>
            {movementsLoading && <p className="py-8 text-center text-sm text-muted">Loading history…</p>}
            {movements?.length === 0 && <EmptyState title="No movements yet" description="Nothing has happened at this store yet." />}
            {movements && movements.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-5 py-3 font-medium">When</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Item</th>
                    <th className="px-5 py-3 font-medium">Quantity</th>
                    <th className="px-5 py-3 font-medium">By</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id} className="border-b border-border last:border-0 hover:bg-surface-alt">
                      <td className="px-5 py-3 text-xs text-muted">{new Date(m.createdAt).toLocaleString()}</td>
                      <td className="px-5 py-3">
                        <Badge tone={MOVEMENT_TONE[m.movementType] ?? 'neutral'}>{m.movementType}</Badge>
                      </td>
                      <td className="px-5 py-3">{m.item.name}</td>
                      <td className="px-5 py-3 font-mono">{m.quantity}</td>
                      <td className="px-5 py-3 text-muted">{m.createdBy.fullName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
