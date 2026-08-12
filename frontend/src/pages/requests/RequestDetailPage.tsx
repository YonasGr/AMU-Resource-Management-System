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

interface Item {
  id: string;
  name: string;
  unit?: string;
}
interface Store {
  id: string;
  name: string;
}
interface Asset {
  id: string;
  assetTag: string;
  item?: { name: string };
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

  const { data: catalogItems } = useQuery({
    queryKey: ["items-lookup"],
    queryFn: async () => (await api.get<{ data: Item[] }>("/items")).data.data,
  });

  const { data: storeDirectory } = useQuery({
    queryKey: ["stores-lookup"],
    queryFn: async () =>
      (await api.get<{ data: Store[] }>("/stores/directory")).data.data,
  });

  const { data: assetDirectory } = useQuery({
    queryKey: ["assets-lookup"],
    queryFn: async () =>
      (await api.get<{ data: Asset[] }>("/assets")).data.data,
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

  const itemMap = new Map(catalogItems?.map((i) => [i.id, i]));
  const storeMap = new Map(storeDirectory?.map((s) => [s.id, s.name]));
  const assetMap = new Map(
    assetDirectory?.map((a) => [a.id, `${a.assetTag} (${a.item?.name || "Asset"})`]),
  );

  const details = request.details || {};

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
          <CardHeader className="text-sm font-medium">Request Details</CardHeader>
          <CardBody className="space-y-4 text-sm">
            {/* Purchase Request Lines */}
            {request.type === "PURCHASE_REQUEST" && Array.isArray(details.lines) && (
              <div>
                <span className="font-semibold text-muted text-xs uppercase tracking-wider block mb-2">
                  Requested Items
                </span>
                <div className="rounded-md border border-border overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-subtle border-b border-border text-muted font-medium">
                      <tr>
                        <th className="px-3 py-2">Item Name</th>
                        <th className="px-3 py-2 text-right">Quantity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {details.lines.map((line: any, idx: number) => {
                        const item = itemMap.get(line.itemId);
                        return (
                          <tr key={idx} className="hover:bg-surface-subtle/50">
                            <td className="px-3 py-2 font-medium">
                              {item?.name || line.itemId}
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-primary">
                              {line.quantity} {item?.unit || "units"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Item Request */}
            {request.type === "ITEM_REQUEST" && (
              <div className="space-y-2">
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted">Item:</span>
                  <span className="font-semibold text-primary">
                    {itemMap.get(details.itemId)?.name || details.itemId}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted">Quantity:</span>
                  <span className="font-bold">
                    {details.quantity} {itemMap.get(details.itemId)?.unit || "units"}
                  </span>
                </div>
                {details.targetStoreId && (
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted">Issue Store:</span>
                    <span className="font-medium">
                      {storeMap.get(details.targetStoreId) || details.targetStoreId}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Transfer Request */}
            {request.type === "TRANSFER_REQUEST" && (
              <div className="space-y-2">
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted">Item:</span>
                  <span className="font-semibold text-primary">
                    {itemMap.get(details.itemId)?.name || details.itemId}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted">Quantity:</span>
                  <span className="font-bold">
                    {details.quantity} {itemMap.get(details.itemId)?.unit || "units"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted">From Store:</span>
                  <span className="font-medium">
                    {storeMap.get(details.sourceStoreId) || details.sourceStoreId}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted">To Store:</span>
                  <span className="font-medium">
                    {storeMap.get(details.destinationStoreId) || details.destinationStoreId}
                  </span>
                </div>
              </div>
            )}

            {/* Borrow Asset Request */}
            {request.type === "BORROW_REQUEST" && (
              <div className="space-y-2">
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted">Asset:</span>
                  <span className="font-semibold text-primary">
                    {assetMap.get(details.assetId) || details.assetId}
                  </span>
                </div>
                {details.purpose && (
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted">Purpose:</span>
                    <span className="font-medium">{details.purpose}</span>
                  </div>
                )}
                {details.expectedReturnDate && (
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted">Expected Return:</span>
                    <span className="font-medium">{details.expectedReturnDate}</span>
                  </div>
                )}
              </div>
            )}

            {/* Disposal Request */}
            {request.type === "DISPOSAL_REQUEST" && (
              <div className="space-y-2">
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted">Asset:</span>
                  <span className="font-semibold text-primary">
                    {assetMap.get(details.assetId) || details.assetId}
                  </span>
                </div>
                {details.reason && (
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted">Disposal Reason:</span>
                    <span className="font-medium">{details.reason}</span>
                  </div>
                )}
                {details.method && (
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted">Disposal Method:</span>
                    <span className="font-medium">{details.method}</span>
                  </div>
                )}
              </div>
            )}

            {/* Notes / Justification */}
            {details.notes && (
              <div className="rounded-md bg-surface-subtle p-3 text-xs text-ink mt-3">
                <span className="font-semibold text-muted block mb-1">
                  Justification / Notes:
                </span>
                <p className="italic">"{details.notes}"</p>
              </div>
            )}
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
            Approval Timeline
          </CardHeader>
          <CardBody>
            {!request.workflowInstance && (
              <p className="text-sm text-muted">Not submitted yet.</p>
            )}
            {request.workflowInstance && (
              <>
                {request.workflowInstance.status === "PENDING" &&
                  currentStepName && (
                    <div className="mb-4 rounded-md bg-accent/10 p-3 text-sm text-accent">
                      <div className="flex items-center justify-between">
                        <span>Waiting on: {currentStepName}</span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => approveMutation.mutate()}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                            className="rounded p-1 hover:bg-white/50 disabled:opacity-50"
                            title="Approve step"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => rejectMutation.mutate()}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                            className="rounded p-1 hover:bg-white/50 disabled:opacity-50 text-danger"
                            title="Reject step"
                          >
                            <XIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {(approveMutation.isError || rejectMutation.isError) && (
                        <p className="mt-1.5 text-xs text-danger font-medium">
                          {((approveMutation.error || rejectMutation.error) as any)?.response?.data?.message || 'Could not record action.'}
                        </p>
                      )}
                    </div>
                  )}
                <ol className="space-y-3">
                  {request.workflowInstance.history.map((h) => (
                    <li key={h.id} className="flex items-start gap-3 text-sm">
                      <Badge tone={statusTone(h.action)}>{h.action}</Badge>
                      <div>
                        <p className="text-ink font-medium">{h.actedBy.fullName}</p>
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
