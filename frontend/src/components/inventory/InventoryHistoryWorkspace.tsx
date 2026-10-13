import { Building2, History, Truck, User } from 'lucide-react';
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
  material?: { name?: string; materialCode?: string; unit?: string };
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
}

export function InventoryHistoryWorkspace({
  transactions,
  isLoading,
  search,
  typeFilter,
  onSearchChange,
  onTypeFilterChange,
}: InventoryHistoryWorkspaceProps) {
  return (
    <Card className="overflow-hidden space-y-4">
      <div className="flex flex-col gap-3 border-b border-slate-200/80 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-md flex-1">
          <SearchInput value={search} onChange={(event) => onSearchChange(event.target.value)} onClear={() => onSearchChange('')} placeholder="Search transaction code, material, or actor..." />
        </div>
        <div className="-mx-4 flex snap-x gap-1 overflow-x-auto rounded-xl border border-slate-200/80 bg-slate-100 p-1 sm:mx-0 sm:flex-wrap sm:overflow-visible">
          {['ALL', 'STOCK_IN', 'STOCK_OUT', 'RETURN', 'ADJUSTMENT', 'TRANSFER'].map((type) => (
            <button key={type} type="button" onClick={() => onTypeFilterChange(type)} className={`min-h-9 shrink-0 snap-start rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${typeFilter === type ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}>
              {type.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

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
                  <th className="px-6 py-4">Associated Party</th>
                  <th className="px-6 py-4">Issued By</th>
                  <th className="px-6 py-4 text-right">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-900"><span className="rounded-md border border-slate-200/60 bg-slate-100 px-2 py-0.5 text-slate-800">{transaction.transactionCode}</span></td>
                    <td className="px-6 py-4"><Badge tone={transaction.type === 'STOCK_IN' ? 'success' : transaction.type === 'STOCK_OUT' ? 'info' : transaction.type === 'RETURN' ? 'warning' : 'purple'}>{transaction.type.replace('_', ' ')}</Badge></td>
                    <td className="px-6 py-4"><p className="font-bold text-slate-900">{transaction.material?.name}</p><p className="font-mono text-xs text-slate-400">{transaction.material?.materialCode}</p></td>
                    <td className="px-6 py-4 text-center font-bold text-slate-900">{transaction.type === 'STOCK_IN' || transaction.type === 'RETURN' ? '+' : '-'}{transaction.quantity} {transaction.material?.unit}s</td>
                    <td className="px-6 py-4 text-xs text-slate-600"><AssociatedParty transaction={transaction} /></td>
                    <td className="px-6 py-4 text-xs text-slate-600"><span className="font-medium">{transaction.issuedBy?.fullName || 'System'}</span></td>
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
