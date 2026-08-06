import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Send, X as XIcon } from "lucide-react";
import { api } from "../../lib/api";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Badge, statusTone } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { useAuthStore } from "../../store/auth.store";

interface WorkflowStep {
  order: number;
  name: string;
}
interface HistoryEntry {
  id: string;
  stepOrder: number;
  action: string;
  comment?: string;
  createdAt: string;
  actedBy: { fullName: string };
}
interface RequestDetail {
  id: string;
  type: string;
  status: string;
  details: Record<string, any>;
  requesterId: string;
  requester: { fullName: string };
  workflowInstance?: {
    currentStepOrder: number;
    status: string;
    workflowTemplate: { steps: WorkflowStep[] };
    history: HistoryEntry[];
  } | null;
}

const TYPE_LABEL: Record<string, string> = {
  ITEM_REQUEST: "Item Request",
  TRANSFER_REQUEST: "Transfer Request",
  PURCHASE_REQUEST: "Purchase Request",
  BORROW_REQUEST: "Borrow Asset Request",
  DISPOSAL_REQUEST: "Asset Disposal Request",
};

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const {
    data: request,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["request", id],
    queryFn: async () =>
      (await api.get<{ data: RequestDetail }>(`/requests/${id}`)).data.data,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["request", id] });
    queryClient.invalidateQueries({ queryKey: ["my-pending-approvals"] });
    queryClient.invalidateQueries({ queryKey: ["my-pending-approvals-count"] });
  };

  const submitMutation = useMutation({
    mutationFn: () => api.post(`/requests/${id}/submit`),
    onSuccess: invalidate,
  });
  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/requests/${id}/cancel`),
    onSuccess: invalidate,
  });
  const approveMutation = useMutation({
    mutationFn: () => api.post(`/requests/${id}/approve`),
    onSuccess: invalidate,
  });
  const rejectMutation = useMutation({
    mutationFn: () => api.post(`/requests/${id}/reject`),
    onSuccess: invalidate,
  });

  if (isLoading) return <p className="text-sm text-muted">Loading request…</p>;
  if (error || !request) {
    return (
      <p className="text-sm text-danger">
        Couldn't load this request — it may not exist, or you may not have
        access to it.
      </p>
    );
  }

  const isOwner = request.requesterId === currentUser?.id;
  const canCancel =
    isOwner &&
    ["DRAFT", "SUBMITTED", "PENDING_APPROVAL"].includes(request.status);
  const currentStepName = request.workflowInstance?.workflowTemplate.steps.find(
    (s) => s.order === request.workflowInstance!.currentStepOrder,
  )?.name;

  return (
    <div>
      <Link
        to="/requests"
        className="mb-4 flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to requests
      </Link>
      <PageHeader
        title={TYPE_LABEL[request.type] ?? request.type}
        description={`Requested by ${request.requester.fullName}`}
        actions={
          <Badge tone={statusTone(request.status)}>
            {request.status.replace("_", " ")}
          </Badge>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="text-sm font-medium">Details</CardHeader>
          <CardBody className="space-y-2 text-sm">
            {Object.entries(request.details).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="capitalize text-muted">
                  {key.replace(/([A-Z])/g, " $1")}
                </span>
                <span className="font-mono text-xs">{String(value)}</span>
              </div>
            ))}
          </CardBody>
          {(request.status === "DRAFT" || canCancel) && (
            <div className="flex gap-2 border-t border-border px-5 py-4">
              {request.status === "DRAFT" && (
                <Button
                  size="sm"
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending}
                >
                  <Send className="h-3.5 w-3.5" /> Submit
                </Button>
              )}
              {canCancel && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                >
                  Cancel request
                </Button>
              )}
            </div>
          )}
          {(submitMutation.isError || cancelMutation.isError) && (
            <p className="px-5 pb-4 text-xs text-danger">
              {((submitMutation.error ?? cancelMutation.error) as any)?.response
                ?.data?.message ?? "Something went wrong."}
            </p>
          )}
        </Card>

        <Card>
          <CardHeader className="text-sm font-medium">
            Approval timeline
          </CardHeader>
          <CardBody>
            {!request.workflowInstance && (
              <p className="text-sm text-muted">Not submitted yet.</p>
            )}
            {request.workflowInstance && (
              <>
                {request.workflowInstance.status === "PENDING" &&
                  currentStepName && (
                    <div className="mb-4 flex items-center justify-between rounded-md bg-accent/10 px-3 py-2 text-sm text-accent">
                      <span>Waiting on: {currentStepName}</span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => approveMutation.mutate()}
                          className="rounded p-1 hover:bg-white/50"
                          title="Approve"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => rejectMutation.mutate()}
                          className="rounded p-1 hover:bg-white/50"
                          title="Reject"
                        >
                          <XIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                <ol className="space-y-3">
                  {request.workflowInstance.history.map((h) => (
                    <li key={h.id} className="flex items-start gap-3 text-sm">
                      <Badge tone={statusTone(h.action)}>{h.action}</Badge>
                      <div>
                        <p className="text-ink">{h.actedBy.fullName}</p>
                        {h.comment && (
                          <p className="text-xs text-muted">"{h.comment}"</p>
                        )}
                        <p className="text-xs text-muted">
                          {new Date(h.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </li>
                  ))}
                  {request.workflowInstance.history.length === 0 && (
                    <p className="text-sm text-muted">
                      No decisions recorded yet.
                    </p>
                  )}
                </ol>
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
