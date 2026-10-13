import { useEffect, useState } from 'react';
import { ArrowDownUp, Building2, Clock3, History, Truck, User } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { EmptyState as EmptyStateComponent } from '../ui/EmptyState';
import { SearchInput } from '../ui/Input';

interface InventoryTransaction {
  id: string;
  transactionCode: string;
  type: string;
  quantity: number;
  createdAt: string;
  material?: { id?: string; name?: string; materialCode?: string; unit?: string };
  supplier?: { name?: string };
  employee?: { fullName?: string };
  department?: { name?: string };
  request?: { requestNumber?: string };
  issuedBy?: { fullName?: string };
}

interface InventoryHistoryWorkspaceProps {
  transactions: InventoryTransaction[];
  isLoading: boolean;
  search: string;
  typeFilter: string;
  onSearchChange: (value: string) => void;
  onTypeFilterChange: (value: string) => void;
  materialId: string;
  onMaterialIdChange: (value: string) => void;
  sortBy: 'createdAt' | 'quantity';
  onSortChange: (value: 'createdAt' | 'quantity') => void;
  asOf?: string;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}

export function InventoryHistoryWorkspace({
  transactions,
  isLoading,
  search,
  typeFilter,
  onSearchChange,
  onTypeFilterChange,
  materialId,
  onMaterialIdChange,
  sortBy,
  onSortChange,
  asOf,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: InventoryHistoryWorkspaceProps) {
  const [savedViews, setSavedViews] = useState<Array<{ name: string; search: string; type: string; sort: 'createdAt' | 'quantity' }>>([]);
  const [selectedView, setSelectedView] = useState('');
  const [showParty, setShowParty] = useState(true);
  const [showActor, setShowActor] = useState(true);

  useEffect(() => {
    try {
      setSavedViews(JSON.parse(localStorage.getItem('inventory-history-views') ?? '[]'));
      const columns = JSON.parse(localStorage.getItem('inventory-history-columns') ?? '{}');
      if (typeof columns.showParty === 'boolean') setShowParty(columns.showParty);
      if (typeof columns.showActor === 'boolean') setShowActor(columns.showActor);
    } catch {
      setSavedViews([]);
    }
  }, []);

  const saveView = () => {
    const name = window.prompt('Name this history view');
    if (!name?.trim()) return;
    const next = [
      ...savedViews.filter((view) => view.name !== name.trim()),
      { name: name.trim(), search, type: typeFilter, sort: sortBy },
    ];
    setSavedViews(next);
    localStorage.setItem('inventory-history-views', JSON.stringify(next));
    setSelectedView(name.trim());
  };

  const updateColumnPreference = (column: 'showParty' | 'showActor', value: boolean) => {
    const next = {
      showParty: column === 'showParty' ? value : showParty,
      showActor: column === 'showActor' ? value : showActor,
    };
    if (column === 'showParty') setShowParty(value);
    if (column === 'showActor') setShowActor(value);
    localStorage.setItem('inventory-history-columns', JSON.stringify(next));
  };

  return (
    <Card className="overflow-hidden space-y-4">
      <div className="flex flex-col gap-3 border-b border-slate-200/80 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-md flex-1">
          <SearchInput value={search} onChange={(event) => onSearchChange(event.target.value)} onClear={() => onSearchChange('')} placeholder="Search transaction code, material, or actor..." />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600">
            <ArrowDownUp className="h-3.5 w-3.5" />
            <select
              value={sortBy}
              onChange={(event) => onSortChange(event.target.value as 'createdAt' | 'quantity')}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none"
              aria-label="Sort transaction history"
            >
              <option value="createdAt">Newest</option>
              <option value="quantity">Quantity</option>
            </select>
          </label>
          <select
            value={selectedView}
            onChange={(event) => {
              const view = savedViews.find((item) => item.name === event.target.value);
              setSelectedView(event.target.value);
              if (view) {
                onSearchChange(view.search);
                onTypeFilterChange(view.type);
                onSortChange(view.sort);
              }
            }}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-700"
            aria-label="Saved history view"
          >
            <option value="">Saved views</option>
            {savedViews.map((view) => <option key={view.name} value={view.name}>{view.name}</option>)}
          </select>
          <button type="button" onClick={saveView} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 hover:border-teal-300 hover:text-teal-700">
            Save view
          </button>
          <label className="hidden items-center gap-1 text-[11px] font-semibold text-slate-500 lg:inline-flex">
            <input type="checkbox" checked={showParty} onChange={(event) => updateColumnPreference('showParty', event.target.checked)} />
            Party
          </label>
          <label className="hidden items-center gap-1 text-[11px] font-semibold text-slate-500 lg:inline-flex">
            <input type="checkbox" checked={showActor} onChange={(event) => updateColumnPreference('showActor', event.target.checked)} />
            Actor
          </label>
          <div className="flex snap-x gap-1 overflow-x-auto rounded-xl border border-slate-200/80 bg-slate-100 p-1">
            {['ALL', 'STOCK_IN', 'STOCK_OUT', 'RETURN', 'ADJUSTMENT', 'TRANSFER'].map((type) => (
              <button key={type} type="button" onClick={() => onTypeFilterChange(type)} className={`min-h-9 shrink-0 snap-start rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${typeFilter === type ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}>
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {asOf && (
        <p className="flex items-center gap-1.5 px-4 text-[11px] font-semibold text-slate-500">
          <Clock3 className="h-3.5 w-3.5" />
          Results as of {new Date(asOf).toLocaleString()}
        </p>
      )}
      {materialId && (
        <div className="mx-4 flex items-center justify-between rounded-xl border border-teal-100 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800">
          <span>Showing linked movement history for one material.</span>
          <button type="button" onClick={() => onMaterialIdChange('')} className="font-bold underline">
            Clear material filter
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="py-16 text-center">
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
          <p className="mt-3 text-xs font-semibold text-slate-500">Loading ledger records...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="p-8">
          <EmptyStateComponent icon={History} title="No transaction records found" description="There are no inventory ledger movements matching your search query." />
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="border-b border-slate-200/80 bg-slate-50/90 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">Transaction Code</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Material Details</th>
                  <th className="px-6 py-4 text-center">Quantity</th>
                  {showParty && <th className="px-6 py-4">Associated Party</th>}
                  {showActor && <th className="px-6 py-4">Issued By</th>}
                  <th className="px-6 py-4 text-right">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-900"><span className="rounded-md border border-slate-200/60 bg-slate-100 px-2 py-0.5 text-slate-800">{transaction.transactionCode}</span></td>
                    <td className="px-6 py-4"><Badge tone={transaction.type === 'STOCK_IN' ? 'success' : transaction.type === 'STOCK_OUT' ? 'info' : transaction.type === 'RETURN' ? 'warning' : 'purple'}>{transaction.type.replace('_', ' ')}</Badge></td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{transaction.material?.name}</p>
                      <button
                        type="button"
                        onClick={() => onMaterialIdChange(transaction.material?.id ?? '')}
                        className="font-mono text-xs text-teal-700 hover:underline"
                        disabled={!transaction.material?.id}
                      >
                        {transaction.material?.materialCode}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-900">{transaction.type === 'STOCK_IN' || transaction.type === 'RETURN' ? '+' : '-'}{transaction.quantity} {transaction.material?.unit}s</td>
                    {showParty && <td className="px-6 py-4 text-xs text-slate-600"><AssociatedParty transaction={transaction} /></td>}
                    {showActor && <td className="px-6 py-4 text-xs text-slate-600"><span className="font-medium">{transaction.issuedBy?.fullName || 'System'}</span></td>}
                    <td className="px-6 py-4 text-right text-xs font-medium text-slate-400">{new Date(transaction.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-slate-100 sm:hidden" aria-label="Inventory transaction history">
            {transactions.map((transaction) => {
              const associatedParty = transaction.supplier?.name || transaction.employee?.fullName || transaction.department?.name || 'Central Store';
              const isIncoming = transaction.type === 'STOCK_IN' || transaction.type === 'RETURN';
              return (
                <li key={transaction.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="break-words text-sm font-bold text-slate-900">{transaction.material?.name}</p><p className="mt-1 font-mono text-[11px] text-slate-500">{transaction.material?.materialCode} · {transaction.transactionCode}</p></div>
                    <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${isIncoming ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'}`}>{isIncoming ? '+' : '−'}{transaction.quantity} {transaction.material?.unit || 'unit'}{transaction.quantity === 1 ? '' : 's'}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2"><Badge tone={transaction.type === 'STOCK_IN' ? 'success' : transaction.type === 'STOCK_OUT' ? 'info' : transaction.type === 'RETURN' ? 'warning' : 'purple'}>{transaction.type.replace('_', ' ')}</Badge><span className="text-xs text-slate-600">{associatedParty}{transaction.request?.requestNumber ? ` · ${transaction.request.requestNumber}` : ''}</span></div>
                  <p className="mt-2 text-[11px] text-slate-500">{new Date(transaction.createdAt).toLocaleString()} · {transaction.issuedBy?.fullName || 'System'}</p>
                </li>
              );
            })}
          </ul>
          {hasNextPage && (
            <div className="flex justify-center border-t border-slate-100 p-4">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={isFetchingNextPage}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-teal-300 hover:text-teal-700 disabled:opacity-60"
              >
                {isFetchingNextPage ? 'Loading more...' : 'Load more records'}
              </button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function AssociatedParty({ transaction }: { transaction: InventoryTransaction }) {
  if (transaction.supplier) return <span className="inline-flex items-center gap-1 font-semibold text-slate-800"><Truck className="h-3.5 w-3.5 text-slate-400" />{transaction.supplier.name}</span>;
  if (transaction.employee) return <span className="inline-flex items-center gap-1 font-semibold text-slate-800"><User className="h-3.5 w-3.5 text-slate-400" />{transaction.employee.fullName}</span>;
  if (transaction.department) return <span className="inline-flex items-center gap-1 font-semibold text-slate-800"><Building2 className="h-3.5 w-3.5 text-slate-400" />{transaction.department.name}{transaction.request?.requestNumber ? ` · ${transaction.request.requestNumber}` : ''}</span>;
  return <span className="italic text-slate-400">Central Store</span>;
}
