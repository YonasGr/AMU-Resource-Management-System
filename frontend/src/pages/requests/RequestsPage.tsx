import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import {
  FileText,
  Plus,
  CheckCircle,
  XCircle,
  PackageCheck,
  Clock,
  User,
  Building,
} from 'lucide-react';

export default function RequestsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [activeTab, setActiveTab] = useState<'my' | 'approvals' | 'issue'>('my');
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
      setIsModalOpen(false);
      setPurpose('');
      setSelectedItems([]);
    },
  });

  // Approve / Reject Mutation
  const approveRejectMutation = useMutation({
    mutationFn: async ({ id, action, remarks }: { id: string; action: 'APPROVE' | 'REJECT'; remarks?: string }) => {
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

  const isManager = user?.role === 'STORE_MANAGER' || user?.role === 'ADMINISTRATOR';
  const isKeeper = user?.role === 'STOREKEEPER' || user?.role === 'STORE_MANAGER' || user?.role === 'ADMINISTRATOR';

  const pendingRequests = requests?.filter((r: any) => r.status === 'PENDING') || [];
  const approvedRequests = requests?.filter((r: any) => r.status === 'APPROVED') || [];
  const myRequests = requests?.filter((r: any) => r.requesterId === user?.id) || requests || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-indigo-600" /> Material Requests Hub
          </h1>
          <p className="text-sm text-slate-500">
            Submit item requests, approve requests, and fulfill material issuance
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-colors"
        >
          <Plus className="h-4 w-4" /> Submit New Request
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('my')}
          className={`pb-3 transition-colors ${
            activeTab === 'my'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          All Requests ({requests?.length ?? 0})
        </button>

        {isManager && (
          <button
            onClick={() => setActiveTab('approvals')}
            className={`pb-3 flex items-center gap-2 transition-colors ${
              activeTab === 'approvals'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Manager Approvals Queue
            {pendingRequests.length > 0 && (
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">
                {pendingRequests.length}
              </span>
            )}
          </button>
        )}

        {isKeeper && (
          <button
            onClick={() => setActiveTab('issue')}
            className={`pb-3 flex items-center gap-2 transition-colors ${
              activeTab === 'issue'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Storekeeper Fulfill (Stock Out)
            {approvedRequests.length > 0 && (
              <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs text-white">
                {approvedRequests.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-slate-500">Loading requests...</div>
        ) : (
          (activeTab === 'approvals'
            ? pendingRequests
            : activeTab === 'issue'
            ? approvedRequests
            : myRequests
          ).map((req: any) => (
            <div
              key={req.id}
              className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 space-y-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-slate-900">
                      {req.requestNumber}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-bold ${
                        req.status === 'PENDING'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : req.status === 'APPROVED'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : req.status === 'ISSUED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {req.status === 'PENDING' && <Clock className="h-3 w-3" />}
                      {req.status === 'APPROVED' && <CheckCircle className="h-3 w-3" />}
                      {req.status === 'ISSUED' && <PackageCheck className="h-3 w-3" />}
                      {req.status === 'REJECTED' && <XCircle className="h-3 w-3" />}
                      {req.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-slate-800">{req.purpose}</p>
                </div>

                <div className="text-xs text-slate-500 space-y-1">
                  <p className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-slate-400" /> Requester: <span className="font-semibold text-slate-700">{req.requester?.fullName}</span>
                  </p>
                  <p className="flex items-center gap-1">
                    <Building className="h-3.5 w-3.5 text-slate-400" /> Dept: <span className="font-semibold text-slate-700">{req.department?.name}</span>
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Requested Materials
                </p>
                <div className="divide-y divide-slate-200/60">
                  {req.items?.map((item: any) => (
                    <div key={item.id} className="py-2 flex items-center justify-between text-sm">
                      <div>
                        <span className="font-semibold text-slate-900">{item.material?.name}</span>
                        <span className="text-xs text-slate-500 ml-2">({item.material?.materialCode})</span>
                      </div>
                      <div className="font-bold text-slate-800">
                        {item.quantityRequested} {item.material?.unit || 'unit'}s
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons for Manager & Keeper */}
              {activeTab === 'approvals' && req.status === 'PENDING' && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <input
                    type="text"
                    placeholder="Optional remarks/comments..."
                    value={selectedRequestId === req.id ? managerRemarks : ''}
                    onChange={(e) => {
                      setSelectedRequestId(req.id);
                      setManagerRemarks(e.target.value);
                    }}
                    className="w-full sm:w-80 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:outline-none"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() =>
                        approveRejectMutation.mutate({
                          id: req.id,
                          action: 'REJECT',
                          remarks: managerRemarks,
                        })
                      }
                      disabled={approveRejectMutation.isPending}
                      className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500"
                    >
                      Reject Request
                    </button>
                    <button
                      onClick={() =>
                        approveRejectMutation.mutate({
                          id: req.id,
                          action: 'APPROVE',
                          remarks: managerRemarks,
                        })
                      }
                      disabled={approveRejectMutation.isPending}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500"
                    >
                      Approve Request
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'issue' && req.status === 'APPROVED' && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => issueMutation.mutate({ id: req.id })}
                    disabled={issueMutation.isPending}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition-colors"
                  >
                    <PackageCheck className="h-4 w-4" /> Issue Materials (Stock Out)
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* New Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-900">Submit Material Request</h2>
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department *</label>
                <select
                  required
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">Select Department</option>
                  {departments?.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Purpose of Issue *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. End of semester exam paper printing for CS Dept"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Add Material Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Materials *</label>
                <select
                  onChange={(e) => {
                    handleAddItem(e.target.value);
                    e.target.value = '';
                  }}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">Choose item to add to request...</option>
                  {materials?.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.materialCode}) — Avail: {m.stockSummary?.remainingQuantity ?? 0} {m.unit}s
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Items Table */}
              {selectedItems.length > 0 && (
                <div className="rounded-xl border border-slate-200 p-3 space-y-2 bg-slate-50">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Selected Items List:
                  </p>
                  {selectedItems.map((item, idx) => {
                    const mat = materials?.find((m: any) => m.id === item.materialId);
                    return (
                      <div key={item.materialId} className="flex items-center justify-between gap-3 text-sm bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="font-medium text-slate-900">{mat?.name}</span>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min={1}
                            value={item.quantityRequested}
                            onChange={(e) => handleUpdateItemQty(idx, Number(e.target.value))}
                            className="w-20 rounded-md border border-slate-300 p-1 text-center text-xs"
                          />
                          <span className="text-xs text-slate-500">{mat?.unit}s</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-xs font-bold text-rose-600 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRequestMutation.isPending || selectedItems.length === 0}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {createRequestMutation.isPending ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
