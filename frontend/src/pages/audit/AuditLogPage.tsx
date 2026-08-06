import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardBody } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input, Select, Label } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';

interface AuditEvent {
  id: string;
  source: 'AUDIT_LOG' | 'APPROVAL_HISTORY' | 'INVENTORY_MOVEMENT' | 'ASSET_HISTORY';
  entityType: string;
  entityId: string;
  action: string;
  description: string;
  actedBy: { id: string; fullName: string; email: string };
  createdAt: string;
  before?: any;
  after?: any;
}

const ACTION_COLOR: Record<string, 'success' | 'warning' | 'danger' | 'accent' | 'neutral'> = {
  CREATE: 'success',
  UPDATE: 'accent',
  DELETE: 'danger',
  DEACTIVATE: 'warning',
  LOGIN: 'neutral',
  ROLE_ASSIGNED: 'accent', // Actually supposed to be purple but accent is blue
  ROLE_REVOKED: 'danger',
};

export default function AuditLogPage() {
  const [entityType, setEntityType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ entityType: '', from: '', to: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['audit-log', filters.entityType, filters.from, filters.to, page],
    queryFn: async () =>
      (
        await api.get<{ data: { data: AuditEvent[]; total: number } }>('/audit', {
          params: {
            entityType: filters.entityType || undefined,
            from: filters.from || undefined,
            to: filters.to || undefined,
            page,
            limit: 50,
          },
        })
      ).data.data,
  });

  const handleApply = () => {
    setFilters({ entityType, from, to });
    setPage(1);
  };

  return (
    <div>
      <PageHeader title="Audit Log" description="Track all system events" />

      <Card className="mb-6">
        <CardBody className="flex flex-wrap items-end gap-4 p-4">
          <div className="w-48">
            <Label>Entity Type</Label>
            <Select value={entityType} onChange={(e) => setEntityType(e.target.value)}>
              <option value="">All Types</option>
              {['User', 'Store', 'OrganizationUnit', 'Request', 'Asset', 'Role', 'Supplier'].map(
                (type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                )
              )}
            </Select>
          </div>
          <div>
            <Label>From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label>To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button onClick={handleApply}>Apply Filters</Button>
        </CardBody>
      </Card>

      <Card>
        {isLoading && <p className="py-8 text-center text-sm text-muted">Loading audit logs…</p>}
        {data?.data.length === 0 && (
          <EmptyState title="No events found" description="Adjust your filters to see more events." icon={Search} />
        )}
        {data && data.data.length > 0 && (
          <div className="divide-y divide-border">
            {data.data.map((event) => (
              <AuditLogItem key={event.id} event={event} />
            ))}
          </div>
        )}
        {data && data.total > 50 && (
          <div className="flex items-center justify-between border-t border-border p-4">
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-muted">
              Page {page} of {Math.ceil(data.total / 50)}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page * 50 >= data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

function AuditLogItem({ event }: { event: AuditEvent }) {
  const [showDiff, setShowDiff] = useState(false);
  const hasDiff = event.before || event.after;

  return (
    <div className="p-4 hover:bg-surface-alt">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <Badge tone={ACTION_COLOR[event.action] || 'neutral'} className="mt-0.5 whitespace-nowrap">
            {event.action}
          </Badge>
          <div>
            <p className="text-sm text-ink">
              <span className="font-semibold">{event.actedBy.fullName}</span> ({event.actedBy.email})
            </p>
            <p className="text-sm text-muted">
              {event.description}{' '}
              <span className="font-medium">
                ({event.entityType} #{event.entityId.slice(0, 8)})
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-right">
          <span className="text-xs text-muted">{new Date(event.createdAt).toLocaleString()}</span>
          {hasDiff && (
            <Button variant="ghost" size="sm" onClick={() => setShowDiff(!showDiff)}>
              {showDiff ? 'Hide diff' : 'View diff'}
            </Button>
          )}
        </div>
      </div>
      {showDiff && hasDiff && (
        <div className="mt-3 grid gap-4 rounded bg-surface p-3 text-xs md:grid-cols-2">
          {event.before && (
            <div className="overflow-x-auto rounded border border-danger/30 bg-danger/5 p-2 text-danger">
              <pre>{JSON.stringify(event.before, null, 2)}</pre>
            </div>
          )}
          {event.after && (
            <div className="overflow-x-auto rounded border border-success/30 bg-success/5 p-2 text-success">
              <pre>{JSON.stringify(event.after, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
