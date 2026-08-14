import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  FileText,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  Repeat,
  BarChart3,
} from 'lucide-react';
import { useAuthStore } from '../store/auth.store';

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/dashboard/stats');
      return res.data.data ?? res.data;
    },
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500 text-sm">
        Loading dashboard metrics...
      </div>
    );
  }

  const { overview, lowStockAlerts, recentTransactions } = stats || {};

  return (
    <div className="space-y-8">
      {/* Welcome & Role Header */}
      <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl border border-indigo-900/30">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {user?.fullName}!
          </h1>
          <p className="mt-1 text-sm text-indigo-200/80">
            Store Management System Portal — Role: <span className="font-semibold text-white uppercase">{user?.role?.replace('_', ' ')}</span>
          </p>
        </div>
        <div className="flex gap-3">
          {user?.role === 'REQUESTER' && (
            <button
              onClick={() => navigate('/requests')}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all"
            >
              <PlusCircle className="h-4 w-4" /> Request Material
            </button>
          )}
          {(user?.role === 'STOREKEEPER' || user?.role === 'STORE_MANAGER' || user?.role === 'ADMINISTRATOR') && (
            <button
              onClick={() => navigate('/inventory')}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all"
            >
              <Repeat className="h-4 w-4" /> Inventory Ops
            </button>
          )}
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 border border-slate-700 hover:bg-slate-700 transition-all"
          >
            <BarChart3 className="h-4 w-4" /> Reports
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Materials
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">{overview?.totalMaterials ?? 0}</p>
          <p className="mt-1 text-xs text-slate-500">Active items in catalog</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Requests
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">{overview?.pendingRequests ?? 0}</p>
          <p className="mt-1 text-xs text-amber-600 font-medium">Awaiting Manager Approval</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Stock In Receipts
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <ArrowDownLeft className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">{overview?.stockInCount ?? 0}</p>
          <p className="mt-1 text-xs text-slate-500">Materials received</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Low Stock Alerts
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">{overview?.lowStockCount ?? 0}</p>
          <p className="mt-1 text-xs text-rose-600 font-medium">Items below reorder limit</p>
        </div>
      </div>

      {/* Low Stock Alerts & Recent Activity Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Low Stock Items */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Threshold Alerts
            </div>
            <button
              onClick={() => navigate('/materials')}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              View Catalog
            </button>
          </div>

          {lowStockAlerts?.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              All material stock levels are healthy!
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-hidden">
              {lowStockAlerts?.map((item: any) => (
                <div key={item.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      Code: {item.materialCode} | Location: {item.location || 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600 border border-rose-200">
                      {item.remainingQuantity} / {item.minimumStock} {item.unit}s left
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <ArrowUpRight className="h-5 w-5 text-indigo-600" />
              Recent Inventory Transactions
            </div>
            <button
              onClick={() => navigate('/inventory')}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              All Transactions
            </button>
          </div>

          {recentTransactions?.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No transactions recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentTransactions?.map((txn: any) => (
                <div key={txn.id} className="py-3 flex items-center justify-between text-sm">
                  <div>
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase mr-2 ${
                        txn.type === 'STOCK_IN'
                          ? 'bg-emerald-100 text-emerald-700'
                          : txn.type === 'STOCK_OUT'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {txn.type.replace('_', ' ')}
                    </span>
                    <span className="font-medium text-slate-900">{txn.material?.name}</span>
                    <p className="text-xs text-slate-500">Code: {txn.transactionCode}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">
                      {txn.quantity} {txn.material?.unit}s
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(txn.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
