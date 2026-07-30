import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckSquare, Check, X } from 'lucide-react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';

interface PendingApproval {
  id: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  createdBy: { fullName: string };
  workflowTemplate: { name: string };
  currentStep: { name: string; order: number };
}

function ApprovalRow({ approval, onDone }: { approval: PendingApproval; onDone: () => void }) {
  const [comment, setComment] = useState('');
  const [showCommentFor, setShowCommentFor] = useState<'approve' | 'reject' | null>(null);

  const actMutation = useMutation({
    mutationFn: (action: 'approve' | 'reject') =>
      api.post(`/workflows/instances/${approval.id}/${action}`, { comment: comment || undefined }),
    onSuccess: onDone,
  });

  return (
    <div className="flex flex-col gap-3 border-b border-border px-5 py-4 last:border-0">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-ink">{approval.workflowTemplate.name}</p>
          <p className="text-xs text-muted">
            {approval.entityType} · {approval.entityId} · requested by {approval.createdBy.fullName}
          </p>
        </div>
        <Badge tone="warning">{approval.currentStep.name}</Badge>
      </div>

      {showCommentFor ? (
        <div className="flex items-center gap-2">
          <Input
            placeholder="Optional comment…"
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
          <button className="text-xs text-muted hover:text-ink" onClick={() => setShowCommentFor(null)}>
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
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
  const queryClient = useQueryClient();
  const { data: approvals, isLoading } = useQuery({
    queryKey: ['my-pending-approvals'],
    queryFn: async () =>
      (await api.get<{ data: PendingApproval[] }>('/workflows/my-pending-approvals')).data.data,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['my-pending-approvals'] });
    queryClient.invalidateQueries({ queryKey: ['my-pending-approvals-count'] });
  };

  return (
    <div>
      <PageHeader
        title="Approvals"
        description="Everything currently waiting on your decision, across every request type."
      />
      <Card>
        {isLoading && <p className="py-8 text-center text-sm text-muted">Loading your approvals…</p>}
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
    </div>
  );
}
