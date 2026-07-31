import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, FileText } from 'lucide-react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge, statusTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';

interface RequestRow {
  id: string;
  type: string;
  status: string;
  createdAt: string;
}

const TYPE_LABEL: Record<string, string> = {
  ITEM_REQUEST: 'Item Request',
  TRANSFER_REQUEST: 'Transfer Request',
  PURCHASE_REQUEST: 'Purchase Request',
  DISTRIBUTION_REQUEST: 'Distribution Request',
  BORROW_REQUEST: 'Borrow Request',
  DISPOSAL_REQUEST: 'Disposal Request',
  EXTERNAL_REQUEST: 'External Request',
};

export default function RequestsListPage() {
  const [scope, setScope] = useState<'mine' | 'all'>('mine');

  const { data: requests, isLoading } = useQuery({
    queryKey: ['requests', scope],
    queryFn: async () =>
      (await api.get<{ data: RequestRow[] }>('/requests', { params: { scope } })).data.data,
  });

  return (
    <div>
      <PageHeader
        title="Requests"
        description="Item requests and transfers you've submitted, and how far they've gotten."
        actions={
          <Link to="/requests/new">
            <Button size="sm"><Plus className="h-4 w-4" /> New request</Button>
          </Link>
        }
      />

      <div className="mb-4 flex gap-1 border-b border-border">
        <button
          onClick={() => setScope('mine')}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${scope === 'mine' ? 'border-primary text-primary' : 'border-transparent text-muted'}`}
        >
          My requests
        </button>
        <button
          onClick={() => setScope('all')}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${scope === 'all' ? 'border-primary text-primary' : 'border-transparent text-muted'}`}
        >
          All requests
        </button>
      </div>

      <Card>
        {isLoading && <p className="py-8 text-center text-sm text-muted">Loading requests…</p>}
        {requests?.length === 0 && (
          <EmptyState
            icon={FileText}
            title="No requests yet"
            description="Start one from the button above — item requests and transfers both go through here."
          />
        )}
        {requests && requests.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Submitted</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-alt">
                  <td className="px-5 py-3">
                    <Link to={`/requests/${r.id}`} className="font-medium text-primary hover:underline">
                      {TYPE_LABEL[r.type] ?? r.type}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-muted">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3">
                    <Badge tone={statusTone(r.status)}>{r.status.replace('_', ' ')}</Badge>
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
