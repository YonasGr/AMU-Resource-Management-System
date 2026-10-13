import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { TriangleAlert, History, ExternalLink } from 'lucide-react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';

interface Store {
  id: string;
  name: string;
}
interface StoreInventoryRow {
  id: string;
  quantity: number;
  minimumStock: number;
  item: { id: string; name: string; unit: string; location?: string | null };
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

export default function InventoryDashboardPage() {
  const [searchParams] = useSearchParams();
  const [storeId, setStoreId] = useState(searchParams.get('storeId') ?? '');
  const [tab, setTab] = useState<'stock' | 'movements'>('stock');

  const { data: stores } = useQuery({
    queryKey: ['stores-for-inventory'],
    queryFn: async () => (await api.get<{ data: Store[] }>('/stores/directory')).data.data,
  });

  // Deliberately NOT defaulting to stores[0] — the directory is unscoped, so
  // "the first store alphabetically" is frequently one this user has no
  // access to at all. Only auto-select when there's exactly one store total
  // (nothing else to choose from); otherwise the person picks explicitly.
  const effectiveStoreId = storeId || (stores?.length === 1 ? stores[0].id : '');

  const { data: stock, isLoading: stockLoading, error: stockError } = useQuery({
    queryKey: ['store-inventory', effectiveStoreId],
    enabled: Boolean(effectiveStoreId),
    queryFn: async () =>
      (await api.get<{ data: StoreInventoryRow[] }>(`/inventory/stores/${effectiveStoreId}`)).data.data,
    retry: false,
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

  const lowStockCount = stock?.filter((r) => r.quantity <= r.minimumStock).length ?? 0;

  return (
    <div className="min-w-0">
      <PageHeader
        title="Inventory"
        description="Stock levels and movement history — every quantity change here traces back to a movement record."
        actions={
          <div className="w-64">
            <Select value={effectiveStoreId} onChange={(e) => setStoreId(e.target.value)}>
              <option value="">Select a store…</option>
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

      <div className="mb-4 flex gap-1 border-b border-border" role="tablist" aria-label="Inventory dashboard views">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'stock'}
          onClick={() => setTab('stock')}
          className={`border-b-2 px-4 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 ${tab === 'stock' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-ink'}`}
        >
          Stock
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'movements'}
          onClick={() => setTab('movements')}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 ${tab === 'movements' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-ink'}`}
        >
          <History className="h-3.5 w-3.5" /> Movement history
        </button>
      </div>

      <Card>
        {!effectiveStoreId && (
          <EmptyState title="Pick a store" description="Choose a store above to see its stock and movement history." />
        )}
        {effectiveStoreId && tab === 'stock' && (
          <>
            {stockLoading && <p className="py-8 text-center text-sm text-muted">Loading stock…</p>}
            {stockError && (
              <p className="py-8 text-center text-sm text-danger">
                {(stockError as any)?.response?.data?.message ?? "Couldn't load this store's inventory."}
              </p>
            )}
            {stock?.length === 0 && (
              <EmptyState title="No stock recorded" description="Nothing has been received into this store yet." />
            )}
            {stock && stock.length > 0 && (
              <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full text-sm">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-5 py-3 font-medium">Item</th>
                    <th className="px-5 py-3 font-medium">Bin / location</th>
                    <th className="px-5 py-3 font-medium">Quantity</th>
                    <th className="px-5 py-3 font-medium">Reorder at</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.map((row) => (
                    <tr key={row.id} className="border-b border-border last:border-0 hover:bg-surface-alt">
                      <td className="px-5 py-3 font-medium text-ink">{row.item.name}</td>
                      <td className="px-5 py-3 text-xs text-muted">{row.item.location || 'Unassigned'}</td>
                      <td className="px-5 py-3">
                        <span className={`font-mono ${row.quantity <= row.minimumStock ? 'font-semibold text-accent' : ''}`}>
                          {row.quantity}
                        </span>
                        <span className="ml-1 text-xs text-muted">{row.item.unit}</span>
                        {row.quantity <= row.minimumStock && (
                          <Badge tone="warning" className="ml-2" withDot={false}>Low stock</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-muted">{row.minimumStock}</td>
                      <td className="px-5 py-3">
                        <Link
                          to="/inventory"
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-primary outline-none transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                          Open operations
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </>
        )}

        {effectiveStoreId && tab === 'movements' && (
          <>
            {movementsLoading && <p className="py-8 text-center text-sm text-muted">Loading history…</p>}
            {movements?.length === 0 && <EmptyState title="No movements yet" description="Nothing has happened at this store yet." />}
            {movements && movements.length > 0 && (
              <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full text-sm">
                <thead className="sticky top-0 z-10 bg-white">
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
                      <td className="px-5 py-3">
                        <p>{m.item.name}</p>
                        {(m.fromStore || m.toStore) && (
                          <p className="mt-0.5 text-[11px] text-muted">
                            {m.fromStore?.name ?? 'External'} → {m.toStore?.name ?? 'External'}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3 font-mono">{m.quantity}</td>
                      <td className="px-5 py-3 text-muted">{m.createdBy.fullName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
