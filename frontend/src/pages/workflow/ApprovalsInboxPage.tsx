import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CheckSquare, Check, X, History as HistoryIcon } from 'lucide-react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge, statusTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';

const TYPE_LABEL: Record<string, string> = {
  ITEM_REQUEST: 'Item Request',
  TRANSFER_REQUEST: 'Transfer Request',
  PURCHASE_REQUEST: 'Purchase Request',
  DISTRIBUTION_REQUEST: 'Distribution Request',
  BORROW_REQUEST: 'Borrow Request',
  DISPOSAL_REQUEST: 'Disposal Request',
  EXTERNAL_REQUEST: 'External Request',
};

interface PendingApproval {
  id: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  createdBy: { fullName: string };
  workflowTemplate: { name: string };
  currentStep: { name: string; order: number };
  requestDetails?: {
    id: string;
    type: string;
    notes?: string;
    items?: Array<{ name: string; quantity: number; unit?: string }>;
    targetStoreName?: string;
    sourceStoreName?: string;
    destinationStoreName?: string;
    assetInfo?: string;
    organizationName?: string;
  };
}

interface ApprovalHistoryItem {
  id: string;
  action: string;
  comment?: string;
  createdAt: string;
  workflowInstance: {
    entityType: string;
    entityId: string;
    status: string;
    workflowTemplate: { name: string };
    createdBy: { fullName: string; email: string };
  };
  requestDetails?: { id: string; type: string; status: string };
}

function ApprovalRow({ approval, onDone }: { approval: PendingApproval; onDone: () => void }) {
  const [comment, setComment] = useState('');
  const [showCommentFor, setShowCommentFor] = useState<'approve' | 'reject' | null>(null);

  const isKnownRequestType = Boolean(TYPE_LABEL[approval.entityType]);
  const req = approval.requestDetails;

  const actMutation = useMutation({
    mutationFn: (action: 'approve' | 'reject') =>
      isKnownRequestType
        ? api.post(`/requests/${approval.entityId}/${action}`, { comment: comment || undefined })
        : api.post(`/workflows/instances/${approval.id}/${action}`, { comment: comment || undefined }),
    onSuccess: onDone,
  });

  return (
    <div className="flex flex-col gap-3 border-b border-border px-5 py-4 last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-ink text-base">
              {isKnownRequestType ? TYPE_LABEL[approval.entityType] : approval.workflowTemplate.name}
            </h3>
            {approval.entityId && (
              <Link
                to={`/requests/${approval.entityId}`}
                className="text-xs text-primary hover:underline font-medium"
              >
                View Full Details →
              </Link>
            )}
          </div>
          <p className="text-xs text-muted mt-0.5">
            Requested by <span className="font-medium text-ink">{approval.createdBy.fullName}</span>
            {req?.organizationName ? ` (${req.organizationName})` : ''} • {new Date(approval.createdAt).toLocaleString()}
          </p>
        </div>
        <Badge tone="warning">{approval.currentStep.name}</Badge>
      </div>

      {/* Rich Request Information Box */}
      <div className="rounded-md border border-border/70 bg-surface-subtle/50 p-3.5 text-xs text-ink space-y-2">
        {req?.items && req.items.length > 0 && (
          <div>
            <span className="font-semibold text-muted block mb-1">Requested Items:</span>
            <ul className="list-disc list-inside space-y-0.5 font-medium">
              {req.items.map((item, idx) => (
                <li key={idx}>
                  <span className="font-bold text-primary">{item.quantity} {item.unit || 'units'}</span> × {item.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        {req?.targetStoreName && (
          <p>
            <span className="font-semibold text-muted">Issue Store:</span> <span className="font-medium">{req.targetStoreName}</span>
          </p>
        )}

        {req?.sourceStoreName && (
          <p>
            <span className="font-semibold text-muted">Store Transfer:</span>{' '}
            <span className="font-medium">{req.sourceStoreName}</span> → <span className="font-medium">{req.destinationStoreName}</span>
          </p>
        )}

        {req?.assetInfo && (
          <p>
            <span className="font-semibold text-muted">Asset Details:</span> <span className="font-medium">{req.assetInfo}</span>
          </p>
        )}

        {req?.notes && (
          <p className="border-t border-border/40 pt-1.5 mt-1.5 italic text-muted">
            <span className="font-semibold not-italic text-ink">Justification / Notes:</span> "{req.notes}"
          </p>
        )}
      </div>

      {showCommentFor ? (
        <div className="flex items-center gap-2 mt-1">
          <Input
            placeholder="Optional comment for approval/rejection…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            autoFocus
          />
          <Button
            size="sm"
            variant={showCommentFor === 'approve' ? 'primary' : 'danger'}
            disabled={actMutation.isPending}
            onClick={() => actMutation.mutate(showCommentFor)}
          >
            Confirm {showCommentFor === 'approve' ? 'approval' : 'rejection'}
          </Button>
          <button className="text-xs text-muted hover:text-ink px-2" onClick={() => setShowCommentFor(null)}>
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 mt-1">
          <Button size="sm" onClick={() => setShowCommentFor('approve')}>
            <Check className="h-3.5 w-3.5" /> Approve
          </Button>
          <Button size="sm" variant="danger" onClick={() => setShowCommentFor('reject')}>
            <X className="h-3.5 w-3.5" /> Reject
          </Button>
        </div>
      )}
      {actMutation.isError && (
        <p className="text-xs text-danger">
          {(actMutation.error as any)?.response?.data?.message ?? 'Could not record your decision.'}
        </p>
      )}
    </div>
  );
}

export default function ApprovalsInboxPage() {
  const [tab, setTab] = useState<'pending' | 'history'>('pending');
  const queryClient = useQueryClient();

  const { data: approvals, isLoading: loadingPending } = useQuery({
    queryKey: ['my-pending-approvals'],
    queryFn: async () =>
      (await api.get<{ data: PendingApproval[] }>('/workflows/my-pending-approvals')).data.data,
  });

  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ['my-approval-history'],
    queryFn: async () =>
      (await api.get<{ data: ApprovalHistoryItem[] }>('/workflows/my-approval-history')).data.data,
    enabled: tab === 'history',
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['my-pending-approvals'] });
    queryClient.invalidateQueries({ queryKey: ['my-pending-approvals-count'] });
    queryClient.invalidateQueries({ queryKey: ['my-approval-history'] });
    queryClient.invalidateQueries({ queryKey: ['request'] });
    queryClient.invalidateQueries({ queryKey: ['requests'] });
  };

  return (
    <div>
      <PageHeader
        title="Approvals"
        description="Everything waiting on your decision, and past decisions you've recorded."
      />

      <div className="mb-4 flex gap-1 border-b border-border">
        <button
          onClick={() => setTab('pending')}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${tab === 'pending' ? 'border-primary text-primary' : 'border-transparent text-muted'}`}
        >
          Pending Approvals {approvals?.length ? `(${approvals.length})` : ''}
        </button>
        <button
          onClick={() => setTab('history')}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${tab === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted'}`}
        >
          My Past Decisions
        </button>
      </div>

      {tab === 'pending' && (
        <Card>
          {loadingPending && <p className="py-8 text-center text-sm text-muted">Loading your approvals…</p>}
          {approvals?.length === 0 && (
            <EmptyState
              icon={CheckSquare}
              title="Nothing waiting on you"
              description="When a request reaches a step you're eligible to act on, it'll show up here."
            />
          )}
          {approvals?.map((approval) => (
            <ApprovalRow key={approval.id} approval={approval} onDone={refresh} />
          ))}
        </Card>
      )}

      {tab === 'history' && (
        <Card>
          {loadingHistory && <p className="py-8 text-center text-sm text-muted">Loading your decision history…</p>}
          {history?.length === 0 && (
            <EmptyState
              icon={HistoryIcon}
              title="No past decisions recorded"
              description="Approvals and rejections you complete will be logged here for your records."
            />
          )}
          {history && history.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 font-medium">Your Action</th>
                  <th className="px-5 py-3 font-medium">Request Type</th>
                  <th className="px-5 py-3 font-medium">Requested By</th>
                  <th className="px-5 py-3 font-medium">Your Comment</th>
                  <th className="px-5 py-3 font-medium">Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => {
                  const typeLabel =
                    TYPE_LABEL[h.workflowInstance?.entityType] ??
                    h.workflowInstance?.workflowTemplate?.name ??
                    'Request';
                  return (
                    <tr key={h.id} className="border-b border-border last:border-0 hover:bg-surface-alt">
                      <td className="px-5 py-3">
                        <Badge tone={statusTone(h.action)}>{h.action}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        {h.workflowInstance?.entityId ? (
                          <Link
                            to={`/requests/${h.workflowInstance.entityId}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {typeLabel}
                          </Link>
                        ) : (
                          <span className="font-medium text-ink">{typeLabel}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-ink">
                        {h.workflowInstance?.createdBy?.fullName || '—'}
                      </td>
                      <td className="px-5 py-3 text-muted italic">
                        {h.comment ? `"${h.comment}"` : '—'}
                      </td>
                      <td className="px-5 py-3 text-muted text-xs">
                        {new Date(h.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
}
