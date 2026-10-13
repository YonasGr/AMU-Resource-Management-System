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
  QrCode,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input, Select, Label, Textarea, SearchInput } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  AuditorModeBadge,
  InventoryDocumentShell,
  InventoryDocumentTab,
} from '../../components/inventory/InventoryDocumentShell';

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAuditor = user?.role === 'AUDITOR';
  const isKeeper =
    user?.role === 'STOREKEEPER' ||
    user?.role === 'STORE_MANAGER' ||
    user?.role === 'ADMINISTRATOR';
  const canAdjustStock = user?.role === 'STORE_MANAGER' || user?.role === 'ADMINISTRATOR';
  const canMutateStock = isKeeper;

  const [activeTab, setActiveTab] = useState<
    'receipt' | 'out' | 'return' | 'transfer' | 'adjust' | 'history'
  >(isAuditor ? 'history' : 'receipt');

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Common Form States
  const [materialId, setMaterialId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [supplierId, setSupplierId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [deliveryReference, setDeliveryReference] = useState('');
  const [remarks, setRemarks] = useState('');
  const [newQuantity, setNewQuantity] = useState(0);
  const [adjustReasonCode, setAdjustReasonCode] = useState('');
  const [adjustRemarks, setAdjustRemarks] = useState('');
  const [breakGlass, setBreakGlass] = useState(false);
  const [returnRequestId, setReturnRequestId] = useState('');
  const [returnRequestItemId, setReturnRequestItemId] = useState('');
  const [returnQuantity, setReturnQuantity] = useState(1);

  // Ledger Filter State
  const [historySearch, setHistorySearch] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('ALL');

  // Clear feedback when switching tabs
  const handleTabChange = (
    tab: 'receipt' | 'out' | 'return' | 'transfer' | 'adjust' | 'history',
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

  const { data: issuedRequests } = useQuery({
    queryKey: ['material-requests', 'issued-returnable'],
    queryFn: async () => {
      const res = await api.get('/requests');
      return (res.data.data ?? res.data).filter(
        (request: any) => request.status === 'ISSUED' && request.items?.some(
          (item: any) => item.quantityIssued > (item.quantityReturned ?? 0),
        ),
      );
    },
    enabled: activeTab === 'return',
  });

  const selectedReturnRequest = issuedRequests?.find((request: any) => request.id === returnRequestId);
  const selectedReturnItem = selectedReturnRequest?.items?.find((item: any) => item.id === returnRequestItemId);
  const returnableItems = selectedReturnRequest?.items?.filter(
    (item: any) => item.quantityIssued > (item.quantityReturned ?? 0),
  ) ?? [];
  const returnableQuantity = selectedReturnItem
    ? selectedReturnItem.quantityIssued - (selectedReturnItem.quantityReturned ?? 0)
    : 0;

  // Fetch Transactions
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['inventory-transactions'],
    queryFn: async () => {
      const res = await api.get('/inventory/transactions');
      return res.data.data ?? res.data;
    },
  });

  // Mutations
  const receiptMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/inventory/receipts', data);
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      const code = data?.data?.receiptCode || data?.receiptCode || '';
      setFeedback({
        type: 'success',
        message: `Goods receipt draft created successfully. ${code ? `Receipt Code: ${code}` : ''}`,
      });
      resetForm();
    },
    onError: (err: any) => {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to create goods receipt draft',
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
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      const code = data?.data?.transactionCode || data?.transactionCode || '';
      setFeedback({
        type: 'success',
        message: `Return to stock recorded successfully! ${code ? `Transaction Code: ${code}` : ''}`,
      });
      resetForm();
      setReturnRequestId('');
      setReturnRequestItemId('');
      setReturnQuantity(1);
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
    setSupplierId('');
    setEmployeeId('');
    setDepartmentId('');
    setPurpose('');
    setDeliveryReference('');
    setRemarks('');
    setNewQuantity(0);
    setAdjustReasonCode('');
    setAdjustRemarks('');
    setBreakGlass(false);
  };

  const handleReceiptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    receiptMutation.mutate({
      materialId,
      storeId: user?.storeId,
      quantityReceived: Number(quantity),
      supplierId: supplierId || undefined,
      deliveryReference: deliveryReference || undefined,
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
      requestId: returnRequestId,
      requestItemId: returnRequestItemId,
      materialId,
      quantity: Number(returnQuantity),
      departmentId: selectedReturnRequest?.departmentId,
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
      reasonCode: adjustReasonCode,
      remarks: adjustRemarks,
      breakGlass,
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

  const operationTabs: InventoryDocumentTab[] = [
    ...(!isAuditor && canMutateStock
      ? [
          { id: 'receipt', label: 'Goods Receipt Draft', icon: ArrowDownLeft, activeClassName: 'bg-emerald-600' },
          { id: 'out', label: 'Direct Stock Out', icon: ArrowUpRight, activeClassName: 'bg-cyan-600' },
          { id: 'return', label: 'Request Returns', icon: RotateCcw, activeClassName: 'bg-amber-600' },
          { id: 'adjust', label: 'Stock Adjustments', icon: Sliders, activeClassName: 'bg-purple-600' },
          { id: 'transfer', label: 'Store Transfer', icon: ArrowRightLeft, activeClassName: 'bg-teal-700' },
        ]
      : []),
    {
      id: 'history',
      label: 'Transaction History Ledger',
      icon: History,
      activeClassName: 'bg-brand-900',
      count: transactions?.length ?? 0,
    },
  ];

  return (
    <InventoryDocumentShell
      title={isAuditor ? 'Inventory Audit Ledger' : 'Inventory Operations & Ledger'}
      description={
        isAuditor
          ? 'Independent compliance inspection ledger of all university physical stock transactions, supplier deliveries, and departmental issuances.'
          : 'Execute physical stock movements, supplier shipments, direct issues, departmental transfers, and audit adjustments.'
      }
      headerIcon={Repeat}
      breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Inventory Operations' }]}
      headerActions={isAuditor ? <AuditorModeBadge /> : undefined}
      tabs={operationTabs}
      activeTab={activeTab}
      onTabChange={(tab) => handleTabChange(tab as typeof activeTab)}
      feedback={feedback}
      onDismissFeedback={() => setFeedback(null)}
      roleGuidance={
        !isKeeper && activeTab !== 'history' ? (
          <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-bold">Store Operator Privilege Required for Execution</p>
              <p className="mt-0.5 text-amber-700">
                You are viewing this operation in preview mode as <strong>{user?.role?.replace('_', ' ')}</strong>. To record official stock movements, log in as <strong>Storekeeper</strong>, <strong>Store Manager</strong>, or <strong>Administrator</strong>.
              </p>
            </div>
          </div>
        ) : null
      }
    >

      {/* 2-Column Workflow for Active Form */}
      {activeTab !== 'history' ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Form (2 cols) */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>
                    {activeTab === 'receipt' && 'Create Goods Receipt Draft'}
                    {activeTab === 'out' && 'Record Direct Stock Out (Store Issuance)'}
                    {activeTab === 'return' && 'Record Return Against Request'}
                    {activeTab === 'adjust' && 'Manual Physical Stock Audit Adjustment'}
                    {activeTab === 'transfer' && 'Record Store Department Transfer'}
                  </CardTitle>
                  <CardDescription>
                    {activeTab === 'return'
                      ? 'Select the issued request and item. Returns are capped at the outstanding quantity and recorded against that request.'
                      : 'Fill in the transaction details to update current inventory balances and log audit records.'}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardBody>
                {activeTab === 'receipt' && (
                  <form onSubmit={handleReceiptSubmit} className="space-y-4">
                    <div>
                      <Label required>Select Material</Label>
                      <Select
                        required
                        value={materialId}
                        onChange={(e) => setMaterialId(e.target.value)}
                      >
                        <option value="">Choose received item...</option>
                        {materials?.map((m: any) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.materialCode}) — Current: {m.stockSummary?.remainingQuantity ?? 0} {m.unit}s
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label required>Quantity Delivered</Label>
                        <Input
                          type="number"
                          required
                          min={1}
                          value={quantity}
                          onChange={(e) => setQuantity(Number(e.target.value))}
                        />
                      </div>

                      <div>
                        <Label>Delivery Reference</Label>
                        <Input
                          placeholder="Supplier delivery note or invoice reference"
                          value={deliveryReference}
                          onChange={(e) => setDeliveryReference(e.target.value)}
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
                      <Label>Inspection Notes</Label>
                      <Input
                        placeholder="Condition, packaging, or receiving notes"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>Additional Notes</Label>
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
                        disabled={!isKeeper || receiptMutation.isPending}
                        isLoading={receiptMutation.isPending}
                        leftIcon={<ArrowDownLeft className="h-4 w-4" />}
                      >
                        Create Draft for Independent Inspection
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
                      <Label required>Original Issued Request</Label>
                      <Select
                        required
                        value={returnRequestId}
                        onChange={(e) => {
                          const requestId = e.target.value;
                          const request = issuedRequests?.find((item: any) => item.id === requestId);
                          const firstReturnable = request?.items?.find(
                            (item: any) => item.quantityIssued > (item.quantityReturned ?? 0),
                          );
                          setReturnRequestId(requestId);
                          setReturnRequestItemId(firstReturnable?.id ?? '');
                          setMaterialId(firstReturnable?.materialId ?? '');
                          setReturnQuantity(1);
                        }}
                      >
                        <option value="">Choose an issued request...</option>
                        {issuedRequests?.map((request: any) => (
                          <option key={request.id} value={request.id}>
                            {request.requestNumber} — {request.requester?.fullName || 'Requester'} ({request.department?.name || 'Department'})
                          </option>
                        ))}
                      </Select>
                      {issuedRequests?.length === 0 && (
                        <p className="mt-2 text-xs font-medium text-slate-500">
                          No issued requests have an outstanding quantity to return.
                        </p>
                      )}
                    </div>

                    {returnRequestId && (
                      <>
                        <div>
                          <Label required>Issued Material</Label>
                          <Select
                            required
                            value={returnRequestItemId}
                            onChange={(e) => {
                              const itemId = e.target.value;
                              const item = selectedReturnRequest?.items?.find((row: any) => row.id === itemId);
                              setReturnRequestItemId(itemId);
                              setMaterialId(item?.materialId ?? '');
                              setReturnQuantity(1);
                            }}
                          >
                            <option value="">Choose a material from this request...</option>
                            {returnableItems.map((item: any) => (
                              <option key={item.id} value={item.id}>
                                {item.material?.name} ({item.material?.materialCode}) — {item.quantityIssued - (item.quantityReturned ?? 0)} eligible
                              </option>
                            ))}
                          </Select>
                          {returnableItems.length === 0 && (
                            <p className="mt-2 text-xs font-medium text-slate-500">All issued items on this request have already been returned.</p>
                          )}
                        </div>

                        {selectedReturnItem && (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                            <p className="font-semibold">{selectedReturnItem.material?.name}</p>
                            <p className="mt-1 text-xs">Issued: {selectedReturnItem.quantityIssued} · Returned: {selectedReturnItem.quantityReturned ?? 0} · Still eligible: {returnableQuantity}</p>
                          </div>
                        )}
                      </>
                    )}

                    <div>
                      <Label required>Quantity Returned</Label>
                      <Input
                        type="number"
                        required
                        min={1}
                        step={1}
                        max={returnableQuantity}
                        value={returnQuantity}
                        onChange={(e) => setReturnQuantity(Number(e.target.value))}
                      />
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
                        disabled={!isKeeper || returnMutation.isPending || !selectedReturnItem || returnQuantity < 1 || returnQuantity > returnableQuantity}
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
                      <Label required>Adjustment Reason Code</Label>
                      <Select
                        required
                        value={adjustReasonCode}
                        onChange={(e) => setAdjustReasonCode(e.target.value)}
                      >
                        <option value="">Choose a controlled reason...</option>
                        <option value="COUNT_VARIANCE">Physical count variance</option>
                        <option value="DAMAGE">Damaged stock</option>
                        <option value="EXPIRY">Expired stock</option>
                        <option value="LOSS">Stock loss</option>
                        <option value="FOUND_STOCK">Found stock</option>
                        <option value="CORRECTION">Data correction</option>
                        <option value="OTHER">Other approved exception</option>
                      </Select>
                    </div>

                    <div>
                      <Label required>Operator Remarks</Label>
                      <Textarea
                        required
                        rows={2}
                        placeholder="Describe what was verified and why the adjustment is required"
                        value={adjustRemarks}
                        onChange={(e) => setAdjustRemarks(e.target.value)}
                      />
                    </div>

                    {user?.role === 'ADMINISTRATOR' && (
                      <label className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                        <input
                          type="checkbox"
                          checked={breakGlass}
                          onChange={(e) => setBreakGlass(e.target.checked)}
                          className="mt-1"
                        />
                        <span>
                          <strong>Break-glass authorization</strong>
                          <span className="block text-xs">
                            Required for adjustments exceeding 10 units. This action is highlighted in the audit trail.
                          </span>
                        </span>
                      </label>
                    )}

                    <div className="pt-2">
                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                        disabled={!canAdjustStock || adjustMutation.isPending}
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

            <div className="-mx-4 flex snap-x gap-1 overflow-x-auto rounded-xl border border-slate-200/80 bg-slate-100 p-1 sm:mx-0 sm:flex-wrap sm:overflow-visible">
              {['ALL', 'STOCK_IN', 'STOCK_OUT', 'RETURN', 'ADJUSTMENT', 'TRANSFER'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setHistoryTypeFilter(t)}
                  className={`min-h-9 shrink-0 snap-start rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
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
            <>
            <div className="hidden overflow-x-auto sm:block">
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
                            {txn.department.name}{txn.request?.requestNumber ? ` · ${txn.request.requestNumber}` : ''}
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
            <ul className="divide-y divide-slate-100 sm:hidden" aria-label="Inventory transaction history">
              {filteredTransactions.map((txn: any) => {
                const associatedParty = txn.supplier?.name || txn.employee?.fullName || txn.department?.name || 'Central Store';
                const isIncoming = txn.type === 'STOCK_IN' || txn.type === 'RETURN';
                return (
                  <li key={txn.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-bold text-slate-900">{txn.material?.name}</p>
                        <p className="mt-1 font-mono text-[11px] text-slate-500">{txn.material?.materialCode} · {txn.transactionCode}</p>
                      </div>
                      <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${isIncoming ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'}`}>
                        {isIncoming ? '+' : '−'}{txn.quantity} {txn.material?.unit || 'unit'}{txn.quantity === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge tone={txn.type === 'STOCK_IN' ? 'success' : txn.type === 'STOCK_OUT' ? 'info' : txn.type === 'RETURN' ? 'warning' : 'purple'}>
                        {txn.type.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-slate-600">
                        {associatedParty}{txn.request?.requestNumber ? ` · ${txn.request.requestNumber}` : ''}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">{new Date(txn.createdAt).toLocaleString()} · {txn.issuedBy?.fullName || 'System'}</p>
                  </li>
                );
              })}
            </ul>
            </>
          )}
        </Card>
      )}
    </InventoryDocumentShell>
  );
}
