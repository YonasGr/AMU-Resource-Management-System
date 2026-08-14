import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Repeat, ArrowDownLeft, ArrowUpRight, RotateCcw, Sliders, History } from 'lucide-react';

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'in' | 'out' | 'return' | 'adjust' | 'history'>('in');

  // Common Form States
  const [materialId, setMaterialId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState<number | undefined>(undefined);
  const [supplierId, setSupplierId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [remarks, setRemarks] = useState('');
  const [newQuantity, setNewQuantity] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');

  // Fetch Materials
  const { data: materials } = useQuery({
    queryKey: ['materials'],
    queryFn: async () => {
      const res = await api.get('/materials');
      return res.data.data ?? res.data;
    },
  });

  // Fetch Suppliers
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res = await api.get('/suppliers');
      return res.data.data ?? res.data;
    },
  });

  // Fetch Employees
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await api.get('/employees');
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

  // Fetch Transactions
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['inventory-transactions'],
    queryFn: async () => {
      const res = await api.get('/inventory/transactions');
      return res.data.data ?? res.data;
    },
  });

  // Mutations
  const stockInMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/inventory/stock-in', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      resetForm();
    },
  });

  const stockOutMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/inventory/stock-out', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      resetForm();
    },
  });

  const returnMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/inventory/return', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      resetForm();
    },
  });

  const adjustMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/inventory/adjustment', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      resetForm();
    },
  });

  const resetForm = () => {
    setMaterialId('');
    setQuantity(1);
    setUnitPrice(undefined);
    setSupplierId('');
    setEmployeeId('');
    setDepartmentId('');
    setPurpose('');
    setRemarks('');
    setNewQuantity(0);
    setAdjustReason('');
  };

  const handleStockInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    stockInMutation.mutate({
      materialId,
      quantity: Number(quantity),
      unitPrice: unitPrice ? Number(unitPrice) : undefined,
      supplierId: supplierId || undefined,
      purpose,
      remarks,
    });
  };

  const handleStockOutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    stockOutMutation.mutate({
      materialId,
      quantity: Number(quantity),
      employeeId: employeeId || undefined,
      departmentId: departmentId || undefined,
      purpose,
      remarks,
    });
  };

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    returnMutation.mutate({
      materialId,
      quantity: Number(quantity),
      employeeId: employeeId || undefined,
      departmentId: departmentId || undefined,
      remarks,
    });
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    adjustMutation.mutate({
      materialId,
      newQuantity: Number(newQuantity),
      reason: adjustReason,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Repeat className="h-6 w-6 text-indigo-600" /> Inventory Operations
        </h1>
        <p className="text-sm text-slate-500">
          Stock In (Receiving), Stock Out (Issuing), Returns, Adjustments, and Transaction History
        </p>
      </div>

      {/* Action Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-sm font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('in')}
          className={`pb-3 flex items-center gap-2 transition-colors ${
            activeTab === 'in'
              ? 'border-b-2 border-emerald-600 text-emerald-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowDownLeft className="h-4 w-4" /> Stock In (Receive Materials)
        </button>

        <button
          onClick={() => setActiveTab('out')}
          className={`pb-3 flex items-center gap-2 transition-colors ${
            activeTab === 'out'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowUpRight className="h-4 w-4" /> Stock Out (Direct Issue)
        </button>

        <button
          onClick={() => setActiveTab('return')}
          className={`pb-3 flex items-center gap-2 transition-colors ${
            activeTab === 'return'
              ? 'border-b-2 border-amber-600 text-amber-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <RotateCcw className="h-4 w-4" /> Material Returns
        </button>

        <button
          onClick={() => setActiveTab('adjust')}
          className={`pb-3 flex items-center gap-2 transition-colors ${
            activeTab === 'adjust'
              ? 'border-b-2 border-purple-600 text-purple-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="h-4 w-4" /> Stock Adjustments
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 flex items-center gap-2 transition-colors ${
            activeTab === 'history'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="h-4 w-4" /> Transaction History Ledger
        </button>
      </div>

      {/* Forms & Views */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        {activeTab === 'in' && (
          <form onSubmit={handleStockInSubmit} className="max-w-xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ArrowDownLeft className="h-5 w-5 text-emerald-600" /> Record Stock In (Receive from Supplier)
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Material *</label>
              <select
                required
                value={materialId}
                onChange={(e) => setMaterialId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              >
                <option value="">Select Material...</option>
                {materials?.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.materialCode}) — Current Remaining: {m.stockSummary?.remainingQuantity ?? 0} {m.unit}s
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity Received *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Unit Price (ETB)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 450.00"
                  value={unitPrice || ''}
                  onChange={(e) => setUnitPrice(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              >
                <option value="">Select Supplier...</option>
                {suppliers?.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.supplierCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Purpose / Source</label>
              <input
                type="text"
                placeholder="e.g. Annual Procurement Batch 1"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
              <textarea
                rows={2}
                placeholder="Delivery note condition, invoice reference..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={stockInMutation.isPending}
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition-colors"
            >
              {stockInMutation.isPending ? 'Processing Stock In...' : 'Confirm Stock In'}
            </button>
          </form>
        )}

        {activeTab === 'out' && (
          <form onSubmit={handleStockOutSubmit} className="max-w-xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-blue-600" /> Record Direct Stock Out (Issue Material)
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Material *</label>
              <select
                required
                value={materialId}
                onChange={(e) => setMaterialId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select Material...</option>
                {materials?.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.materialCode}) — Avail: {m.stockSummary?.remainingQuantity ?? 0} {m.unit}s
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity to Issue *</label>
              <input
                type="number"
                required
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Recipient Employee</label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select Employee...</option>
                  {employees?.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.department?.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Recipient Department</label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select Department...</option>
                  {departments?.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Purpose of Issue</label>
              <input
                type="text"
                placeholder="e.g. Office work station setup"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
              <textarea
                rows={2}
                placeholder="Approval note..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={stockOutMutation.isPending}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-colors"
            >
              {stockOutMutation.isPending ? 'Processing Issue...' : 'Confirm Stock Out'}
            </button>
          </form>
        )}

        {activeTab === 'return' && (
          <form onSubmit={handleReturnSubmit} className="max-w-xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-600" /> Record Material Return to Store
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Material Returned *</label>
              <select
                required
                value={materialId}
                onChange={(e) => setMaterialId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-amber-500 focus:outline-none"
              >
                <option value="">Select Material...</option>
                {materials?.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.materialCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity Returned *</label>
              <input
                type="number"
                required
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Returned By Employee</label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-amber-500 focus:outline-none"
                >
                  <option value="">Select Employee...</option>
                  {employees?.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Returned By Department</label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-amber-500 focus:outline-none"
                >
                  <option value="">Select Department...</option>
                  {departments?.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reason & Condition Remarks</label>
              <textarea
                rows={2}
                placeholder="e.g. Unused items returned in good condition"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={returnMutation.isPending}
              className="w-full rounded-xl bg-amber-600 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-600/30 hover:bg-amber-500 transition-colors"
            >
              {returnMutation.isPending ? 'Processing Return...' : 'Record Return'}
            </button>
          </form>
        )}

        {activeTab === 'adjust' && (
          <form onSubmit={handleAdjustSubmit} className="max-w-xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="h-5 w-5 text-purple-600" /> Manual Stock Count Audit Adjustment
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Material *</label>
              <select
                required
                value={materialId}
                onChange={(e) => setMaterialId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-purple-500 focus:outline-none"
              >
                <option value="">Select Material...</option>
                {materials?.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.materialCode}) — Current System Stock: {m.stockSummary?.remainingQuantity ?? 0} {m.unit}s
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">New Physical Stock Count *</label>
              <input
                type="number"
                required
                min={0}
                value={newQuantity}
                onChange={(e) => setNewQuantity(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Audit Adjustment Reason *</label>
              <textarea
                required
                rows={2}
                placeholder="e.g. Damaged stock removed during annual audit count"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-purple-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={adjustMutation.isPending}
              className="w-full rounded-xl bg-purple-600 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition-colors"
            >
              {adjustMutation.isPending ? 'Adjusting Stock...' : 'Confirm Audit Adjustment'}
            </button>
          </form>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <History className="h-5 w-5 text-indigo-600" /> Full Inventory Transaction History
            </h2>

            {isLoading ? (
              <div className="py-8 text-center text-sm text-slate-500">Loading ledger...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Material</th>
                      <th className="px-4 py-3 text-center">Qty</th>
                      <th className="px-4 py-3">Party (Supplier / Employee / Dept)</th>
                      <th className="px-4 py-3">Issued By</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions?.map((txn: any) => (
                      <tr key={txn.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">
                          {txn.transactionCode}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                              txn.type === 'STOCK_IN'
                                ? 'bg-emerald-100 text-emerald-700'
                                : txn.type === 'STOCK_OUT'
                                ? 'bg-blue-100 text-blue-700'
                                : txn.type === 'RETURN'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {txn.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {txn.material?.name}
                        </td>
                        <td className="px-4 py-3 text-center font-bold">
                          {txn.quantity} {txn.material?.unit}s
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {txn.supplier?.name ||
                            txn.employee?.fullName ||
                            txn.department?.name ||
                            'N/A'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {txn.issuedBy?.fullName || 'System'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {new Date(txn.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
