import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Plus,
  CheckCircle2,
  XCircle,
  PackageCheck,
  Clock,
  User,
  Building2,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  Boxes,
  Trash2,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, statusTone } from '../../components/ui/Badge';
import { Input, Select, Label, Textarea } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';

export default function RequestsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const isManager = user?.role === 'STORE_MANAGER' || user?.role === 'ADMINISTRATOR';
  // Strict Segregation of Duties: Only physical STOREKEEPER can execute stock issuance
  const isKeeper = user?.role === 'STOREKEEPER';

  // Role-tailored initial tab
  const getInitialTab = (): 'all' | 'my' | 'approvals' | 'issue' => {
    if (user?.role === 'REQUESTER') return 'my';
    if (user?.role === 'STORE_MANAGER') return 'approvals';
    if (user?.role === 'STOREKEEPER') return 'issue';
    return 'all';
  };

  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'approvals' | 'issue'>(getInitialTab());
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [purpose, setPurpose] = useState('');
  const [departmentId, setDepartmentId] = useState(user?.departmentId || '');
  const [selectedItems, setSelectedItems] = useState<
    { materialId: string; quantityRequested: number }[]
  >([]);

  // Remarks State for Approval/Rejection
  const [managerRemarks, setManagerRemarks] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  // Fetch Requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ['material-requests'],
    queryFn: async () => {
      const res = await api.get('/requests');
      return res.data.data ?? res.data;
    },
  });

  // Fetch Materials for selection
  const { data: materials } = useQuery({
    queryKey: ['materials'],
    queryFn: async () => {
      const res = await api.get('/materials');
      return res.data.data ?? res.data;
    },
  });

  // Fetch Departments
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await api.get('/employees/departments');
      return res.data.data ?? res.data;
    },
  });

  // Create Request Mutation
  const createRequestMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/requests', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setIsModalOpen(false);
      setPurpose('');
      setSelectedItems([]);
    },
  });

  // Approve / Reject Mutation
  const approveRejectMutation = useMutation({
    mutationFn: async ({
      id,
      action,
      remarks,
    }: {
      id: string;
      action: 'APPROVE' | 'REJECT';
      remarks?: string;
    }) => {
      const res = await api.post(`/requests/${id}/approve-reject`, { action, remarks });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setSelectedRequestId(null);
      setManagerRemarks('');
    },
  });

  // Issue Items Mutation (Storekeeper Stock Out)
  const issueMutation = useMutation({
    mutationFn: async ({ id, remarks }: { id: string; remarks?: string }) => {
      const res = await api.post(`/requests/${id}/issue`, { remarks });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const handleAddItem = (materialId: string) => {
    if (!materialId) return;
    if (selectedItems.some((i) => i.materialId === materialId)) return;
    setSelectedItems([...selectedItems, { materialId, quantityRequested: 1 }]);
  };

  const handleUpdateItemQty = (index: number, quantityRequested: number) => {
    const updated = [...selectedItems];
    updated[index].quantityRequested = Math.max(1, quantityRequested);
    setSelectedItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) return;
    createRequestMutation.mutate({
      purpose,
      departmentId,
      items: selectedItems,
    });
  };

  const allRequests = requests || [];
  const pendingRequests = requests?.filter((r: any) => r.status === 'PENDING') || [];
  const approvedRequests = requests?.filter((r: any) => r.status === 'APPROVED') || [];
  const myRequests = requests?.filter((r: any) => r.requesterId === user?.id) || [];

  const displayedRequests =
    activeTab === 'approvals'
      ? pendingRequests
      : activeTab === 'issue'
      ? approvedRequests
      : activeTab === 'my'
      ? myRequests
      : allRequests;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title="Material Requests Hub"
        description="Submit departmental requisition orders, approve request workflows, and release store items."
        icon={FileText}
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Material Requests' }]}
        actions={
          <Button
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Submit New Request
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/90 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === 'all'
              ? 'bg-brand-900 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>All Requests</span>
          <span className="rounded-full bg-slate-100/30 px-2 py-0.5 text-[10px] font-bold">
            {allRequests.length}
          </span>
        </button>

        {isKeeper && (
          <button
            type="button"
            onClick={() => setActiveTab('issue')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'issue'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <PackageCheck className="h-3.5 w-3.5" />
            <span>Storekeeper Fulfill (Stock Out)</span>
            {approvedRequests.length > 0 && (
              <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                {approvedRequests.length}
              </span>
            )}
          </button>
        )}

        {isManager && (
          <button
            type="button"
            onClick={() => setActiveTab('approvals')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'approvals'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Manager Approvals Queue</span>
            {pendingRequests.length > 0 && (
              <span className="rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-bold">
                {pendingRequests.length}
              </span>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('my')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === 'my'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <User className="h-3.5 w-3.5" />
          <span>My Requests</span>
          <span className="rounded-full bg-slate-100/30 px-2 py-0.5 text-[10px] font-bold">
            {myRequests.length}
          </span>
        </button>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-16 text-center">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
            <p className="mt-3 text-xs font-semibold text-slate-500">Loading requests...</p>
          </div>
        ) : displayedRequests.length === 0 ? (
          <Card className="p-8">
            <EmptyState
              icon={FileText}
              title="No requests in this queue"
              description={
                activeTab === 'issue'
                  ? 'There are currently no approved requests awaiting stock out release.'
                  : activeTab === 'approvals'
                  ? 'There are currently no pending requests requiring manager approval.'
                  : activeTab === 'my'
                  ? 'You have not submitted any material requisition requests yet.'
                  : 'No material requests found.'
              }
              action={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsModalOpen(true)}
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Submit Request
                </Button>
              }
            />
          </Card>
        ) : (
          displayedRequests.map((req: any) => (
            <Card key={req.id} className="overflow-hidden hover:border-slate-300">
              <CardHeader className="bg-slate-50/60 py-3.5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs">
                    {req.requestNumber}
                  </span>

                  <Badge tone={statusTone(req.status)}>
                    {req.status}
                  </Badge>

                  <span className="text-xs text-slate-400 font-medium">
                    {new Date(req.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold">
                  <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs">
                    <User className="h-3.5 w-3.5 text-teal-600" />
                    {req.requester?.fullName || 'Requester'}
                  </span>
                  <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs">
                    <Building2 className="h-3.5 w-3.5 text-slate-500" />
                    {req.department?.name || 'Department'}
                  </span>
                </div>
              </CardHeader>

              <CardBody className="space-y-4 pt-4">
                {/* Purpose */}
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Purpose / Requisition Justification:
                  </p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">{req.purpose}</p>
                </div>

                {/* Requested Items Table */}
                <div className="rounded-xl border border-slate-200/80 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200/80">
                      <tr>
                        <th className="px-4 py-2.5">Material Name & Code</th>
                        <th className="px-4 py-2.5 text-center">Category</th>
                        <th className="px-4 py-2.5 text-center">Qty Requested</th>
                        <th className="px-4 py-2.5 text-right">Unit of Measure</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {req.items?.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2.5">
                            <span className="font-bold text-slate-900">{item.material?.name}</span>
                            <span className="ml-2 font-mono text-[10px] text-slate-400">
                              ({item.material?.materialCode})
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center text-slate-500">
                            {item.material?.category?.name || 'General'}
                          </td>
                          <td className="px-4 py-2.5 text-center font-bold text-slate-900">
                            {item.quantityRequested}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-slate-600">
                            {item.material?.unit || 'unit'}s
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Action Section for Manager Review */}
                {isManager && req.status === 'PENDING' && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 bg-amber-50/30 p-4 rounded-xl border border-amber-200/60">
                    <div className="w-full sm:flex-1">
                      <Input
                        placeholder="Optional approval remarks or rejection notes..."
                        value={selectedRequestId === req.id ? managerRemarks : ''}
                        onChange={(e) => {
                          setSelectedRequestId(req.id);
                          setManagerRemarks(e.target.value);
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        isLoading={approveRejectMutation.isPending}
                        onClick={() =>
                          approveRejectMutation.mutate({
                            id: req.id,
                            action: 'REJECT',
                            remarks: managerRemarks,
                          })
                        }
                        leftIcon={<X className="h-3.5 w-3.5" />}
                      >
                        Reject
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        isLoading={approveRejectMutation.isPending}
                        onClick={() =>
                          approveRejectMutation.mutate({
                            id: req.id,
                            action: 'APPROVE',
                            remarks: managerRemarks,
                          })
                        }
                        leftIcon={<Check className="h-3.5 w-3.5" />}
                      >
                        Approve Request
                      </Button>
                    </div>
                  </div>
                )}

                {/* Action Section for Storekeeper Issuance */}
                {isKeeper && req.status === 'APPROVED' && (
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 bg-emerald-50/30 p-4 rounded-xl border border-emerald-200/60">
                    <div className="text-xs text-emerald-800 font-medium">
                      Request is approved and ready for stock release to department.
                    </div>
                    <Button
                      type="button"
                      variant="success"
                      size="sm"
                      isLoading={issueMutation.isPending}
                      onClick={() => issueMutation.mutate({ id: req.id })}
                      leftIcon={<PackageCheck className="h-4 w-4" />}
                    >
                      Issue Materials (Stock Out)
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>
          ))
        )}
      </div>

      {/* New Request Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Submit Material Request"
        description="Select requisition items and department purpose for store manager approval."
        size="xl"
      >
        <form onSubmit={handleSubmitRequest} className="space-y-4">
          <div>
            <Label required>Department</Label>
            <Select
              required
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">Select Requisitioning Department...</option>
              {departments?.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label required>Purpose of Requisition</Label>
            <Textarea
              required
              rows={2}
              placeholder="e.g. End of semester examination paper printing and lab supplies"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </div>

          {/* Add Material Selector */}
          <div>
            <Label required>Choose Items to Add</Label>
            <Select
              onChange={(e) => {
                handleAddItem(e.target.value);
                e.target.value = '';
              }}
            >
              <option value="">Select item from catalog to add...</option>
              {materials?.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.materialCode}) — Avail: {m.stockSummary?.remainingQuantity ?? 0} {m.unit}s
                </option>
              ))}
            </Select>
          </div>

          {/* Selected Items Table */}
          {selectedItems.length > 0 && (
            <div className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-slate-50">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Selected Requisition Items ({selectedItems.length}):
              </p>

              <div className="space-y-2">
                {selectedItems.map((item, idx) => {
                  const mat = materials?.find((m: any) => m.id === item.materialId);
                  return (
                    <div
                      key={item.materialId}
                      className="flex items-center justify-between gap-3 text-sm bg-white p-3 rounded-xl border border-slate-200 shadow-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 truncate">{mat?.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{mat?.materialCode}</p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={1}
                            value={item.quantityRequested}
                            onChange={(e) => handleUpdateItemQty(idx, Number(e.target.value))}
                            className="w-20 rounded-lg border border-slate-200 py-1 px-2 text-center text-xs font-bold text-slate-900 focus:border-teal-500 focus:outline-none"
                          />
                          <span className="text-xs font-medium text-slate-500">{mat?.unit}s</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="rounded-lg p-1 text-coral-600 hover:bg-coral-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={selectedItems.length === 0}
              isLoading={createRequestMutation.isPending}
            >
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
