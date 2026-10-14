import React from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Building2,
  Users,
  Shield,
  Layers,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  ClipboardCheck,
  PackageSearch,
  ShieldAlert,
  Warehouse,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { StatCard } from '../components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

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

  const { data: exceptions } = useQuery({
    queryKey: ['dashboard-exceptions'],
    queryFn: async () => {
      const res = await api.get('/dashboard/exceptions');
      return res.data.data ?? res.data;
    },
    refetchInterval: 30000,
    enabled: user?.role !== 'REQUESTER',
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-teal-600 border-t-transparent" />
        <p className="text-xs font-semibold text-slate-500">Loading live store metrics & inventory charts...</p>
      </div>
    );
  }

  if (user?.role === 'REQUESTER') {
    const requesterOverview = stats?.overview;
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Requester workspace</h1>
          <p className="mt-1 text-sm text-slate-500">
            Find materials, submit requests, and follow their progress from one place.
          </p>
        </div>
        {user.status !== 'ACTIVE' && (
          <Card className="border-amber-200 bg-amber-50">
            <CardBody>
              <div className="flex items-start gap-3 text-amber-900">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-bold">Account pending approval</p>
                  <p className="mt-1 text-xs leading-relaxed">
                    You can browse the catalog now. An administrator must approve your account before you can submit a material request.
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <StatCard title="Catalog materials" value={requesterOverview?.totalMaterials ?? 0} subtitle="Available catalog items" icon={Package} tone="teal" onClick={() => navigate('/materials')} />
          <StatCard title="My pending requests" value={requesterOverview?.pendingRequests ?? 0} subtitle="Awaiting review" icon={Clock} tone="amber" onClick={() => navigate('/requests')} />
          <StatCard title="My approved requests" value={requesterOverview?.approvedRequests ?? 0} subtitle="Approved or in fulfillment" icon={CheckCircle2} tone="emerald" onClick={() => navigate('/requests')} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>What you can do</CardTitle>
            <CardDescription>Your workspace is intentionally limited to requester tasks.</CardDescription>
          </CardHeader>
          <CardBody className="flex flex-wrap gap-3">
            <Button variant="primary" onClick={() => navigate('/materials')} leftIcon={<Package className="h-4 w-4" />}>Browse catalog</Button>
            <Button variant="secondary" onClick={() => navigate('/requests')} leftIcon={<FileText className="h-4 w-4" />}>Track my requests</Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  const { overview, lowStockAlerts, recentTransactions } = stats || {};

  const totalMat = overview?.totalMaterials ?? 0;
  const lowCount = overview?.lowStockCount ?? 0;
  const healthyCount = Math.max(0, totalMat - lowCount);

  const stockPieData = [
    { name: 'Healthy Stock', value: healthyCount, color: '#0D9488' },
    { name: 'Low Stock Alert', value: lowCount, color: '#F04D3F' },
  ];

  const activityBarData = [
    { name: 'Stock In', count: overview?.stockInCount ?? 0, fill: '#10B981' },
    { name: 'Stock Out', count: overview?.stockOutCount ?? 0, fill: '#06B6D4' },
    { name: 'Pending Req', count: overview?.pendingRequests ?? 0, fill: '#F59E0B' },
    { name: 'Approved Req', count: overview?.approvedRequests ?? 0, fill: '#6366F1' },
  ];

  const exceptionQueues = [
    {
      label: 'Overdue receiving',
      count: exceptions?.receiving?.length ?? 0,
      icon: PackageSearch,
      tone: 'text-amber-700 bg-amber-50 border-amber-200',
      detail: 'Receipts waiting for inspection or posting beyond 3 days',
    },
    {
      label: 'Overdue counts',
      count: exceptions?.cycleCounts?.length ?? 0,
      icon: ClipboardCheck,
      tone: 'text-purple-700 bg-purple-50 border-purple-200',
      detail: 'Cycle counts waiting beyond the seven-day review window',
    },
    {
      label: 'Quarantine',
      count: exceptions?.quarantine?.length ?? 0,
      icon: ShieldAlert,
      tone: 'text-coral-700 bg-coral-50 border-coral-200',
      detail: 'Returned materials requiring disposition',
    },
    {
      label: 'Approved variances',
      count: exceptions?.variances?.length ?? 0,
      icon: Warehouse,
      tone: 'text-teal-700 bg-teal-50 border-teal-200',
      detail: 'Recent count variances requiring operational follow-up',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Overview</h1>
        <div className="flex flex-wrap items-center gap-2">
          {(user?.role === 'STOREKEEPER' ||
            user?.role === 'STORE_MANAGER' ||
            user?.role === 'ADMINISTRATOR') && (
            <Button
              variant="primary"
              onClick={() => navigate('/inventory')}
              leftIcon={<Repeat className="h-4 w-4" />}
            >
              Inventory operations
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => navigate('/materials')}
            leftIcon={<Package className="h-4 w-4" />}
          >
            Catalog
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate('/reports')}
            leftIcon={<BarChart3 className="h-4 w-4" />}
          >
            Reports
          </Button>
        </div>
      </div>

      {/* Top 4 KPI Metrics Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Catalog Materials"
          value={overview?.totalMaterials ?? 0}
          subtitle="Active items in system catalog"
          icon={Package}
          tone="teal"
          trend={{ value: 'Active', isPositive: true, label: 'catalog items' }}
          onClick={() => navigate('/materials')}
        />

        <StatCard
          title="Pending Requests"
          value={overview?.pendingRequests ?? 0}
          subtitle="Awaiting Manager Approval"
          icon={FileText}
          tone="amber"
          trend={{
            value: `${overview?.pendingRequests ?? 0} queued`,
            isPositive: (overview?.pendingRequests ?? 0) === 0,
            label: 'needs review',
          }}
          onClick={() => navigate('/requests')}
        />

        <StatCard
          title="Stock In Receipts"
          value={overview?.stockInCount ?? 0}
          subtitle="Supplier shipments received"
          icon={ArrowDownLeft}
          tone="emerald"
          trend={{ value: `${overview?.stockInCount ?? 0} batches`, isPositive: true, label: 'recorded' }}
          onClick={() => navigate('/inventory')}
        />

        <StatCard
          title="Low Stock Alerts"
          value={overview?.lowStockCount ?? 0}
          subtitle="Items below reorder limit"
          icon={AlertTriangle}
          tone={overview?.lowStockCount > 0 ? 'coral' : 'teal'}
          trend={{
            value: `${overview?.lowStockCount ?? 0} items`,
            isPositive: (overview?.lowStockCount ?? 0) === 0,
            label: 'require reorder',
          }}
          onClick={() => navigate('/materials')}
        />
      </div>

      {/* Charts Row: Stock Status Donut + Activity Bar Chart */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Donut Chart: Inventory Stock Balance */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <div>
              <CardTitle>Catalog Health Status</CardTitle>
              <CardDescription>Stock availability vs low threshold items</CardDescription>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <Layers className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardBody className="pt-2 pb-6">
            <div className="h-56 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockPieData}
                    innerRadius={58}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {stockPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center pointer-events-none">
                <span className="text-2xl font-extrabold text-slate-900 leading-none">{totalMat}</span>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Items</p>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-center gap-6 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-teal-600" />
                <span className="text-slate-600">Healthy ({healthyCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-coral-500" />
                <span className="text-slate-600">Low Stock ({lowCount})</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Bar Chart: Store Operations Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Store Operations Activity Overview</CardTitle>
              <CardDescription>Volume of stock movements & material request workflows</CardDescription>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> Live Data
            </div>
          </CardHeader>
          <CardBody className="pt-2 pb-6">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityBarData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: '#F8FAFC' }}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {activityBarData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 flex items-center justify-around text-xs font-medium text-slate-500 border-t border-slate-100 pt-3">
              <span>Stock In: <strong className="text-slate-900">{overview?.stockInCount ?? 0}</strong></span>
              <span>Stock Out: <strong className="text-slate-900">{overview?.stockOutCount ?? 0}</strong></span>
              <span>Approved: <strong className="text-slate-900">{overview?.approvedRequests ?? 0}</strong></span>
              <span>Pending: <strong className="text-slate-900">{overview?.pendingRequests ?? 0}</strong></span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Two Column Grid: Low Stock Threshold Alerts & Recent Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <CardTitle>Operational Exception Queues</CardTitle>
              <CardDescription>Prioritized work that should not remain unresolved.</CardDescription>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            As of {exceptions?.asOf ? new Date(exceptions.asOf).toLocaleTimeString() : '—'}
          </span>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {exceptionQueues.map((queue) => {
            const Icon = queue.icon;
            return (
              <div key={queue.label} className={`rounded-2xl border p-4 ${queue.tone}`}>
                <div className="flex items-center justify-between gap-3">
                  <Icon className="h-5 w-5" />
                  <span className="text-2xl font-extrabold">{queue.count}</span>
                </div>
                <p className="mt-3 text-sm font-extrabold">{queue.label}</p>
                <p className="mt-1 text-[11px] leading-relaxed opacity-80">{queue.detail}</p>
              </div>
            );
          })}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-coral-600">
              <AlertTriangle className="h-5 w-5" />
              <CardTitle className="text-slate-900">Low Stock Threshold Alerts</CardTitle>
            </div>
            <button
              onClick={() => navigate('/materials')}
              className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 hover:underline"
            >
              <span>View Catalog</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </CardHeader>

          <CardBody className="p-0">
            {lowStockAlerts?.length === 0 ? (
              <div className="py-12 text-center text-xs font-medium text-slate-400">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
                All material stock levels are healthy and above reorder limits.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {lowStockAlerts?.map((item: any) => {
                  const percent = Math.min(
                    100,
                    Math.round(((item.remainingQuantity || 0) / (item.minimumStock || 1)) * 100),
                  );

                  return (
                    <div key={item.id} className="p-5 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 text-sm truncate">{item.name}</p>
                          <span className="font-mono text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                            {item.materialCode}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 mt-0.5">
                          Category: {item.category || 'General'} • Location: {item.location || 'Central Store'}
                        </p>

                        {/* Mini progress bar */}
                        <div className="mt-2 flex items-center gap-3">
                          <div className="h-1.5 w-32 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-coral-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-coral-600">{percent}% capacity</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center gap-1 rounded-full bg-coral-50 px-2.5 py-1 text-xs font-bold text-coral-700 border border-coral-200">
                          {item.remainingQuantity} / {item.minimumStock} {item.unit}s
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Recent Transactions Ledger */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <ArrowUpRight className="h-4 w-4" />
              </div>
              <CardTitle>Recent Store Transactions</CardTitle>
            </div>
            <button
              onClick={() => navigate('/inventory')}
              className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 hover:underline"
            >
              <span>Full Ledger</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </CardHeader>

          <CardBody className="p-0">
            {recentTransactions?.length === 0 ? (
              <div className="py-12 text-center text-xs font-medium text-slate-400">
                <Clock className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                No transactions recorded yet in this session.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentTransactions?.map((txn: any) => (
                  <div
                    key={txn.id}
                    className="p-5 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge tone={txn.type === 'STOCK_IN' ? 'success' : 'info'}>
                          {txn.type.replace('_', ' ')}
                        </Badge>
                        <span className="font-mono text-xs font-bold text-slate-700">
                          {txn.transactionCode}
                        </span>
                      </div>
                      <p className="font-bold text-slate-900 text-sm truncate">{txn.material?.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Handled by: {txn.issuedBy?.fullName || 'Storekeeper'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-bold text-slate-900 text-sm">
                        {txn.type === 'STOCK_IN' ? '+' : '-'}
                        {txn.quantity} {txn.material?.unit}s
                      </p>
                      <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                        {new Date(txn.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
