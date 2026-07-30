import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Warehouse, Package, CheckSquare, TriangleAlert } from 'lucide-react';
import { api } from '../lib/api';
import { Card, CardBody } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { useAuthStore } from '../store/auth.store';

function StatCard({
  icon: Icon,
  label,
  value,
  to,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  to: string;
}) {
  return (
    <Link to={to}>
      <Card className="transition-shadow hover:shadow-sm">
        <CardBody className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div>
            <p className="font-mono text-2xl font-semibold text-ink">{value}</p>
            <p className="text-sm text-muted">{label}</p>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: stores } = useQuery({
    queryKey: ['stores-count'],
    queryFn: async () => (await api.get('/stores')).data.data.length as number,
  });
  const { data: items } = useQuery({
    queryKey: ['items-count'],
    queryFn: async () => (await api.get('/items')).data.data.length as number,
  });
  const { data: pendingApprovals } = useQuery({
    queryKey: ['my-pending-approvals-count-dashboard'],
    queryFn: async () => (await api.get('/workflows/my-pending-approvals')).data.data.length as number,
  });
  const { data: lowStock } = useQuery({
    queryKey: ['low-stock-count'],
    queryFn: async () => (await api.get('/inventory/low-stock')).data.data.length as number,
  });

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.fullName?.split(' ')[0] ?? ''}`}
        description="A quick look at what needs attention across the university's stores."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Warehouse} label="Stores you can see" value={stores ?? '—'} to="/stores" />
        <StatCard icon={Package} label="Catalog items" value={items ?? '—'} to="/items" />
        <StatCard
          icon={CheckSquare}
          label="Approvals waiting on you"
          value={pendingApprovals ?? '—'}
          to="/approvals"
        />
        <StatCard icon={TriangleAlert} label="Items low on stock" value={lowStock ?? '—'} to="/inventory" />
      </div>
    </div>
  );
}
