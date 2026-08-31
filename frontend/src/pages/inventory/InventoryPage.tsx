import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Repeat,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Sliders,
  History,
  ArrowRightLeft,
  Package,
  Boxes,
  Building2,
  User,
  Truck,
  FileText,
  AlertTriangle,
  CheckCircle2,
  QrCode,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input, Select, Label, Textarea, SearchInput } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAuditor = user?.role === 'AUDITOR';
  const isKeeper =
    user?.role === 'STOREKEEPER' ||
    user?.role === 'STORE_MANAGER' ||
    user?.role === 'ADMINISTRATOR';
  const canMutateStock = isKeeper;

  const [activeTab, setActiveTab] = useState<
    'in' | 'out' | 'return' | 'transfer' | 'adjust' | 'history'
  >(isAuditor ? 'history' : 'in');

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

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

  // Ledger Filter State
  const [historySearch, setHistorySearch] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('ALL');

  // Clear feedback when switching tabs
  const handleTabChange = (
    tab: 'in' | 'out' | 'return' | 'transfer' | 'adjust' | 'history',
  ) => {
    setActiveTab(tab);
    setFeedback(null);
  };

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
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      const code = data?.data?.transactionCode || data?.transactionCode || '';
      setFeedback({
        type: 'success',
        message: `Stock In recorded successfully! ${code ? `Transaction Code: ${code}` : ''}`,
      });
      resetForm();
    },
    onError: (err: any) => {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to record Stock In',
      });
    },
  });

  const stockOutMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/inventory/stock-out', data);
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      const code = data?.data?.transactionCode || data?.transactionCode || '';
      setFeedback({
        type: 'success',
        message: `Stock Out issued successfully! ${code ? `Transaction Code: ${code}` : ''}`,
      });
      resetForm();
    },
    onError: (err: any) => {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to issue Stock Out',
      });
    },
  });

  const returnMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/inventory/return', data);
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      const code = data?.data?.transactionCode || data?.transactionCode || '';
      setFeedback({
        type: 'success',
        message: `Return to stock recorded successfully! ${code ? `Transaction Code: ${code}` : ''}`,
      });
      resetForm();
    },
    onError: (err: any) => {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to process Return',
      });
    },
  });

  const adjustMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/inventory/adjustment', data);
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      const code = data?.data?.transactionCode || data?.transactionCode || '';
      setFeedback({
        type: 'success',
        message: `Stock adjustment audit recorded successfully! ${code ? `Transaction Code: ${code}` : ''}`,
      });
      resetForm();
    },
    onError: (err: any) => {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to adjust stock',
      });
    },
  });

  const transferMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/inventory/transfer', data);
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      const code = data?.data?.transactionCode || data?.transactionCode || '';
      setFeedback({
        type: 'success',
        message: `Material transfer logged successfully! ${code ? `Transaction Code: ${code}` : ''}`,
      });
      resetForm();
    },
    onError: (err: any) => {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to record transfer',
      });
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
    setFeedback(null);
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
    setFeedback(null);
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
    setFeedback(null);
    returnMutation.mutate({
      materialId,
      quantity: Number(quantity),
      employeeId: employeeId || undefined,
      departmentId: departmentId || undefined,
      remarks,
    });
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    transferMutation.mutate({
      materialId,
      quantity: Number(quantity),
      toDepartmentId: departmentId,
      purpose,
      remarks,
    });
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    adjustMutation.mutate({
      materialId,
      newQuantity: Number(newQuantity),
      reason: adjustReason,
    });
  };

  const selectedMaterialObj = materials?.find((m: any) => m.id === materialId);

  // Filter transactions
  const filteredTransactions = (transactions || []).filter((txn: any) => {
    const matchesSearch =
      txn.transactionCode?.toLowerCase().includes(historySearch.toLowerCase()) ||
      txn.material?.name?.toLowerCase().includes(historySearch.toLowerCase()) ||
      txn.issuedBy?.fullName?.toLowerCase().includes(historySearch.toLowerCase());

    const matchesType = historyTypeFilter === 'ALL' || txn.type === historyTypeFilter;

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title={isAuditor ? 'Inventory Audit Ledger' : 'Inventory Operations & Ledger'}
        description={
          isAuditor
            ? 'Independent compliance inspection ledger of all university physical stock transactions, supplier deliveries, and departmental issuances.'
            : 'Execute physical stock movements, supplier shipments, direct issues, departmental transfers, and audit adjustments.'
        }
        icon={Repeat}
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Inventory Operations' }]}
        actions={
          isAuditor ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-purple-500/10 px-3 py-1.5 text-xs font-bold text-purple-700 border border-purple-200">
              <History className="h-4 w-4 text-purple-600" />
              <span>Auditor Read-Only Inspection Mode</span>
            </div>
          ) : undefined
        }
      />

      {/* Action Tabs Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/90 pb-3">
        {!isAuditor && canMutateStock && (
          <>
            <button
              type="button"
              onClick={() => handleTabChange('in')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'in'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <ArrowDownLeft className="h-3.5 w-3.5" />
              <span>Stock In (Receiving)</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('out')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'out'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Direct Stock Out</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('return')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'return'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Material Returns</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('adjust')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'adjust'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Stock Adjustments</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('transfer')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'transfer'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              <span>Store Transfer</span>
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => handleTabChange('history')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === 'history'
              ? 'bg-brand-900 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <History className="h-3.5 w-3.5" />
          <span>Transaction History Ledger</span>
          <span className="rounded-full bg-slate-100/30 px-2 py-0.5 text-[10px] font-bold">
            {transactions?.length ?? 0}
          </span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center gap-3 p-4 rounded-2xl border text-sm font-semibold animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-coral-50 text-coral-800 border-coral-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-coral-600 shrink-0" />
          )}
          <span className="flex-1">{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs underline hover:no-underline opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Non-keeper Role Guidance Banner */}
      {!isKeeper && activeTab !== 'history' && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-bold">Store Operator Privilege Required for Execution</p>
            <p className="mt-0.5 text-amber-700">
              You are viewing this operation in preview mode as <strong>{user?.role?.replace('_', ' ')}</strong>. To record official stock movements, log in as <strong>Storekeeper</strong>, <strong>Store Manager</strong>, or <strong>Administrator</strong>.
            </p>
          </div>
        </div>
      )}

      {/* 2-Column Workflow for Active Form */}
      {activeTab !== 'history' ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Form (2 cols) */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>
                    {activeTab === 'in' && 'Record Stock In (Supplier Shipment)'}
                    {activeTab === 'out' && 'Record Direct Stock Out (Store Issuance)'}
                    {activeTab === 'return' && 'Record Material Return to Inventory'}
                    {activeTab === 'adjust' && 'Manual Physical Stock Audit Adjustment'}
                    {activeTab === 'transfer' && 'Record Store Department Transfer'}
                  </CardTitle>
                  <CardDescription>
                    Fill in the transaction details to update current inventory balances and log audit records.
                  </CardDescription>
                </div>
              </CardHeader>

              <CardBody>
                {activeTab === 'in' && (
                  <form onSubmit={handleStockInSubmit} className="space-y-4">
                    <div>
                      <Label required>Select Material</Label>
                      <Select
                        required
                        value={materialId}
                        onChange={(e) => setMaterialId(e.target.value)}
                      >
                        <option value="">Choose item to stock in...</option>
                        {materials?.map((m: any) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.materialCode}) — Remaining: {m.stockSummary?.remainingQuantity ?? 0} {m.unit}s
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label required>Quantity Received</Label>
                        <Input
                          type="number"
                          required
                          min={1}
                          value={quantity}
                          onChange={(e) => setQuantity(Number(e.target.value))}
                        />
                      </div>

                      <div>
                        <Label>Unit Price (ETB)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="e.g. 450.00"
                          value={unitPrice || ''}
                          onChange={(e) =>
                            setUnitPrice(e.target.value ? Number(e.target.value) : undefined)
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Supplier / Vendor</Label>
                      <Select
                        value={supplierId}
                        onChange={(e) => setSupplierId(e.target.value)}
                      >
                        <option value="">Select Supplier (Optional)...</option>
                        {suppliers?.map((s: any) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.supplierCode})
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <Label>Purpose / Procurement Batch</Label>
                      <Input
                        placeholder="e.g. Annual Academic Procurement Batch 1"
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>Remarks & Delivery Note Reference</Label>
                      <Textarea
                        rows={2}
                        placeholder="Delivery invoice reference, box condition..."
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                      />
                    </div>

                    <div className="pt-2">
                      <Button
                        type="submit"
                        variant="success"
                        size="lg"
                        className="w-full"
                        disabled={!isKeeper || stockInMutation.isPending}
                        isLoading={stockInMutation.isPending}
                        leftIcon={<ArrowDownLeft className="h-4 w-4" />}
                      >
                        Confirm Stock In & Update Balance
                      </Button>
                    </div>
                  </form>
                )}

                {activeTab === 'out' && (
                  <form onSubmit={handleStockOutSubmit} className="space-y-4">
                    <div>
                      <Label required>Select Material</Label>
                      <Select
                        required
                        value={materialId}
                        onChange={(e) => setMaterialId(e.target.value)}
                      >
                        <option value="">Choose item to issue...</option>
                        {materials?.map((m: any) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.materialCode}) — Avail: {m.stockSummary?.remainingQuantity ?? 0} {m.unit}s
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <Label required>Quantity to Issue</Label>
                      <Input
                        type="number"
                        required
                        min={1}
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Recipient Employee</Label>
                        <Select
                          value={employeeId}
                          onChange={(e) => setEmployeeId(e.target.value)}
                        >
                          <option value="">Select Employee...</option>
                          {employees?.map((emp: any) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.fullName} ({emp.department?.name})
                            </option>
                          ))}
                        </Select>
                      </div>

                      <div>
                        <Label>Recipient Department</Label>
                        <Select
                          value={departmentId}
                          onChange={(e) => setDepartmentId(e.target.value)}
                        >
                          <option value="">Select Department...</option>
                          {departments?.map((d: any) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.code})
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label>Purpose of Direct Issue</Label>
                      <Input
                        placeholder="e.g. Department office workstation setup"
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>Remarks</Label>
                      <Textarea
                        rows={2}
                        placeholder="Storekeeper notes or authorization code..."
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                      />
                    </div>

                    <div className="pt-2">
                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full"
                        disabled={!isKeeper || stockOutMutation.isPending}
                        isLoading={stockOutMutation.isPending}
                        leftIcon={<ArrowUpRight className="h-4 w-4" />}
                      >
                        Confirm Stock Out & Issue
                      </Button>
                    </div>
                  </form>
                )}

                {activeTab === 'return' && (
                  <form onSubmit={handleReturnSubmit} className="space-y-4">
                    <div>
                      <Label required>Select Material Returned</Label>
                      <Select
                        required
                        value={materialId}
                        onChange={(e) => setMaterialId(e.target.value)}
                      >
                        <option value="">Choose item being returned...</option>
                        {materials?.map((m: any) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.materialCode})
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <Label required>Quantity Returned</Label>
                      <Input
                        type="number"
                        required
                        min={1}
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Returned By Employee</Label>
                        <Select
                          value={employeeId}
                          onChange={(e) => setEmployeeId(e.target.value)}
                        >
                          <option value="">Select Employee...</option>
                          {employees?.map((emp: any) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.fullName}
                            </option>
                          ))}
                        </Select>
                      </div>

                      <div>
                        <Label>Returned By Department</Label>
                        <Select
                          value={departmentId}
                          onChange={(e) => setDepartmentId(e.target.value)}
                        >
                          <option value="">Select Department...</option>
                          {departments?.map((d: any) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label>Reason & Condition Remarks</Label>
                      <Textarea
                        rows={2}
                        placeholder="e.g. Unused items returned in original unopened packaging"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                      />
                    </div>

                    <div className="pt-2">
                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                        disabled={!isKeeper || returnMutation.isPending}
                        isLoading={returnMutation.isPending}
                        leftIcon={<RotateCcw className="h-4 w-4" />}
                      >
                        Confirm Return to Store
                      </Button>
                    </div>
                  </form>
                )}

                {activeTab === 'adjust' && (
                  <form onSubmit={handleAdjustSubmit} className="space-y-4">
                    <div>
                      <Label required>Select Material to Adjust</Label>
                      <Select
                        required
                        value={materialId}
                        onChange={(e) => setMaterialId(e.target.value)}
                      >
                        <option value="">Choose item for audit adjustment...</option>
                        {materials?.map((m: any) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.materialCode}) — Current System Stock: {m.stockSummary?.remainingQuantity ?? 0} {m.unit}s
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <Label required>New Physical Stock Count</Label>
                      <Input
                        type="number"
                        required
                        min={0}
                        value={newQuantity}
                        onChange={(e) => setNewQuantity(Number(e.target.value))}
                      />
                    </div>

                    <div>
                      <Label required>Audit Adjustment Reason</Label>
                      <Textarea
                        required
                        rows={2}
                        placeholder="e.g. Physical stock recount difference / expired damaged items removed"
                        value={adjustReason}
                        onChange={(e) => setAdjustReason(e.target.value)}
                      />
                    </div>

                    <div className="pt-2">
                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                        disabled={!isKeeper || adjustMutation.isPending}
                        isLoading={adjustMutation.isPending}
                        leftIcon={<Sliders className="h-4 w-4" />}
                      >
                        Confirm Stock Count Adjustment
                      </Button>
                    </div>
                  </form>
                )}

                {activeTab === 'transfer' && (
                  <form onSubmit={handleTransferSubmit} className="space-y-4">
                    <div>
                      <Label required>Select Material</Label>
                      <Select
                        required
                        value={materialId}
                        onChange={(e) => setMaterialId(e.target.value)}
                      >
                        <option value="">Choose item to transfer...</option>
                        {materials?.map((m: any) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.materialCode}) — Avail: {m.stockSummary?.remainingQuantity ?? 0} {m.unit}s
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label required>Quantity to Transfer</Label>
                        <Input
                          type="number"
                          required
                          min={1}
                          value={quantity}
                          onChange={(e) => setQuantity(Number(e.target.value))}
                        />
                      </div>

                      <div>
                        <Label required>Destination Department</Label>
                        <Select
                          required
                          value={departmentId}
                          onChange={(e) => setDepartmentId(e.target.value)}
                        >
                          <option value="">Select Department...</option>
                          {departments?.map((d: any) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.code})
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label>Purpose / Transfer Order</Label>
                      <Input
                        placeholder="e.g. Relocating computer monitors to Lab 3"
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>Remarks</Label>
                      <Textarea
                        rows={2}
                        placeholder="Transfer dispatch note or authorization code..."
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                      />
                    </div>

                    <div className="pt-2">
                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full"
                        disabled={!isKeeper || transferMutation.isPending}
                        isLoading={transferMutation.isPending}
                        leftIcon={<ArrowRightLeft className="h-4 w-4" />}
                      >
                        Record Material Transfer
                      </Button>
                    </div>
                  </form>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Right Live Item Preview Card (1 col) */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <CardTitle>Selected Item Preview</CardTitle>
                </div>
              </CardHeader>

              <CardBody className="space-y-4">
                {selectedMaterialObj ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-200/80">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-teal-900 bg-white px-2.5 py-1 rounded-lg border border-teal-200">
                          {selectedMaterialObj.materialCode}
                        </span>
                        <Badge tone="teal" withDot={false}>
                          {selectedMaterialObj.category?.name || 'General'}
                        </Badge>
                      </div>

                      <h4 className="mt-3 font-extrabold text-slate-900 text-base">
                        {selectedMaterialObj.name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        {selectedMaterialObj.description || 'No description provided'}
                      </p>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-500">Current Remaining:</span>
                        <span className="font-bold text-slate-900">
                          {selectedMaterialObj.stockSummary?.remainingQuantity ?? 0}{' '}
                          {selectedMaterialObj.unit}s
                        </span>
                      </div>

                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-500">Total Stock Received:</span>
                        <span className="font-semibold text-slate-700">
                          {selectedMaterialObj.stockSummary?.quantityReceived ?? 0}{' '}
                          {selectedMaterialObj.unit}s
                        </span>
                      </div>

                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-500">Total Stock Issued:</span>
                        <span className="font-semibold text-slate-700">
                          {selectedMaterialObj.stockSummary?.quantityIssued ?? 0}{' '}
                          {selectedMaterialObj.unit}s
                        </span>
                      </div>

                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-500">Min Alert Limit:</span>
                        <span className="font-semibold text-coral-600">
                          {selectedMaterialObj.minimumStock} {selectedMaterialObj.unit}s
                        </span>
                      </div>

                      <div className="flex justify-between py-2">
                        <span className="text-slate-500">Store Shelf Location:</span>
                        <span className="font-medium text-slate-700">
                          {selectedMaterialObj.location || 'Central Store'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-slate-400">
                    <Package className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                    Select a material from the dropdown to see live inventory balance and shelf location.
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      ) : (
        /* Full History Ledger Table */
        <Card className="overflow-hidden space-y-4">
          <div className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80">
            <div className="flex-1 max-w-md">
              <SearchInput
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                onClear={() => setHistorySearch('')}
                placeholder="Search transaction code, material, or actor..."
              />
            </div>

            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200/80">
              {['ALL', 'STOCK_IN', 'STOCK_OUT', 'RETURN', 'ADJUSTMENT', 'TRANSFER'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setHistoryTypeFilter(t)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    historyTypeFilter === t
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {t.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 text-center">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
              <p className="mt-3 text-xs font-semibold text-slate-500">Loading ledger records...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={History}
                title="No transaction records found"
                description="There are no inventory ledger movements matching your search query."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50/90 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                  <tr>
                    <th className="px-6 py-4">Transaction Code</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Material Details</th>
                    <th className="px-6 py-4 text-center">Quantity</th>
                    <th className="px-6 py-4">Associated Party</th>
                    <th className="px-6 py-4">Issued By</th>
                    <th className="px-6 py-4 text-right">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map((txn: any) => (
                    <tr key={txn.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-bold text-slate-900">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200/60">
                          {txn.transactionCode}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <Badge
                          tone={
                            txn.type === 'STOCK_IN'
                              ? 'success'
                              : txn.type === 'STOCK_OUT'
                              ? 'info'
                              : txn.type === 'RETURN'
                              ? 'warning'
                              : 'purple'
                          }
                        >
                          {txn.type.replace('_', ' ')}
                        </Badge>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{txn.material?.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{txn.material?.materialCode}</p>
                      </td>

                      <td className="px-6 py-4 text-center font-bold text-slate-900">
                        {txn.type === 'STOCK_IN' || txn.type === 'RETURN' ? '+' : '-'}
                        {txn.quantity} {txn.material?.unit}s
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-600">
                        {txn.supplier ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                            <Truck className="h-3.5 w-3.5 text-slate-400" />
                            {txn.supplier.name}
                          </span>
                        ) : txn.employee ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            {txn.employee.fullName}
                          </span>
                        ) : txn.department ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                            {txn.department.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Central Store</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-600">
                        <span className="font-medium">{txn.issuedBy?.fullName || 'System'}</span>
                      </td>

                      <td className="px-6 py-4 text-right text-xs text-slate-400 font-medium">
                        {new Date(txn.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

