import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Badge, statusTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input, Label, Select } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';

type Tab = 'orders' | 'suppliers' | 'receiving';
interface Supplier { id: string; name: string; tin?: string; phone?: string; status: string }
interface Store { id: string; name: string; code: string }
interface Item { id: string; name: string; unit: string }
interface RequestRow { id: string; type: string; status: string }
interface OrderLine { id: string; itemId: string; orderedQuantity: number; receivedQuantity: number; unitPrice: string; item: Item }
interface PurchaseOrder {
  id: string; poNumber: string; status: string; currency: string;
  supplier: Supplier; destinationStore: Store; lines: OrderLine[];
}

const errorMessage = (error: unknown) =>
  (error as any)?.response?.data?.message ?? 'The operation could not be completed.';

export default function ProcurementPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('orders');
  const [supplier, setSupplier] = useState({ name: '', tin: '', phone: '', email: '' });
  const [order, setOrder] = useState({ poNumber: '', supplierId: '', requestId: '', destinationStoreId: '', currency: 'ETB' });
  const [orderLines, setOrderLines] = useState([{ itemId: '', quantity: '', unitPrice: '' }]);
  const [receiptOrderId, setReceiptOrderId] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [receiptQuantities, setReceiptQuantities] = useState<Record<string, string>>({});

  const suppliersQuery = useQuery({
    queryKey: ['procurement-suppliers'],
    queryFn: async () => (await api.get<{ data: Supplier[] }>('/procurement/suppliers')).data.data,
  });
  const ordersQuery = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => (await api.get<{ data: PurchaseOrder[] }>('/procurement/purchase-orders')).data.data,
  });
  const storesQuery = useQuery({
    queryKey: ['stores-directory'],
    queryFn: async () => (await api.get<{ data: Store[] }>('/stores/directory')).data.data,
  });
  const itemsQuery = useQuery({
    queryKey: ['items-for-procurement'],
    queryFn: async () => (await api.get<{ data: Item[] }>('/items')).data.data,
  });
  const requestsQuery = useQuery({
    queryKey: ['approved-purchase-requests'],
    queryFn: async () => (await api.get<{ data: RequestRow[] }>('/requests', { params: { scope: 'all' } })).data.data,
  });

  const activeSuppliers = suppliersQuery.data?.filter((entry) => entry.status === 'ACTIVE') ?? [];
  const approvedRequests = requestsQuery.data?.filter((entry) => entry.type === 'PURCHASE_REQUEST' && entry.status === 'APPROVED') ?? [];
  const receivableOrders = ordersQuery.data?.filter((entry) => ['ISSUED', 'PARTIALLY_RECEIVED'].includes(entry.status)) ?? [];
  const selectedReceiptOrder = useMemo(
    () => receivableOrders.find((entry) => entry.id === receiptOrderId),
    [receivableOrders, receiptOrderId],
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    queryClient.invalidateQueries({ queryKey: ['procurement-suppliers'] });
    queryClient.invalidateQueries({ queryKey: ['store-inventory'] });
  };

  const createSupplier = useMutation({
    mutationFn: () => api.post('/procurement/suppliers', {
      name: supplier.name, tin: supplier.tin || undefined,
      phone: supplier.phone || undefined, email: supplier.email || undefined,
    }),
    onSuccess: () => { setSupplier({ name: '', tin: '', phone: '', email: '' }); refresh(); },
  });
  const createOrder = useMutation({
    mutationFn: () => api.post('/procurement/purchase-orders', {
      ...order,
      lines: orderLines.map((line) => ({
        itemId: line.itemId, quantity: Number(line.quantity), unitPrice: Number(line.unitPrice),
      })),
    }),
    onSuccess: () => {
      setOrder({ poNumber: '', supplierId: '', requestId: '', destinationStoreId: '', currency: 'ETB' });
      setOrderLines([{ itemId: '', quantity: '', unitPrice: '' }]);
      refresh();
    },
  });
  const issueOrder = useMutation({ mutationFn: (id: string) => api.post(`/procurement/purchase-orders/${id}/issue`), onSuccess: refresh });
  const receive = useMutation({
    mutationFn: () => api.post(`/procurement/purchase-orders/${receiptOrderId}/receipts`, {
      receiptNumber,
      lines: selectedReceiptOrder?.lines
        .map((line) => ({ purchaseOrderLineId: line.id, acceptedQuantity: Number(receiptQuantities[line.id] || 0) }))
        .filter((line) => line.acceptedQuantity > 0),
    }),
    onSuccess: () => { setReceiptNumber(''); setReceiptQuantities({}); refresh(); },
  });

  return (
    <div>
      <PageHeader title="Procurement" description="Manage suppliers, approved purchases, purchase orders, and central receiving." />
      <div className="mb-5 flex gap-1 border-b border-border">
        {(['orders', 'suppliers', 'receiving'] as Tab[]).map((value) => (
          <button key={value} onClick={() => setTab(value)} className={`border-b-2 px-4 py-2 text-sm font-medium capitalize ${tab === value ? 'border-primary text-primary' : 'border-transparent text-muted'}`}>
            {value}
          </button>
        ))}
      </div>

      {tab === 'suppliers' && <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <Card><CardHeader><h2 className="font-medium">New supplier</h2></CardHeader><CardBody>
          <div className="space-y-3">
            {(['name', 'tin', 'phone', 'email'] as const).map((field) => <div key={field}>
              <Label>{field.toUpperCase()}</Label><Input value={supplier[field]} onChange={(e) => setSupplier({ ...supplier, [field]: e.target.value })} />
            </div>)}
            <Button disabled={!supplier.name || createSupplier.isPending} onClick={() => createSupplier.mutate()}>Create supplier</Button>
            {createSupplier.isError && <p className="text-sm text-danger">{errorMessage(createSupplier.error)}</p>}
          </div>
        </CardBody></Card>
        <Card>{suppliersQuery.data?.length === 0 ? <EmptyState title="No suppliers" /> : <table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted"><th className="px-5 py-3">Name</th><th>TIN</th><th>Phone</th><th>Status</th></tr></thead><tbody>{suppliersQuery.data?.map((entry) => <tr key={entry.id} className="border-b last:border-0"><td className="px-5 py-3 font-medium">{entry.name}</td><td>{entry.tin ?? '—'}</td><td>{entry.phone ?? '—'}</td><td><Badge tone={statusTone(entry.status)}>{entry.status}</Badge></td></tr>)}</tbody></table>}</Card>
      </div>}

      {tab === 'orders' && <div className="space-y-6">
        <Card><CardHeader><h2 className="font-medium">Create purchase order</h2></CardHeader><CardBody>
          <div className="grid gap-3 md:grid-cols-4">
            <div><Label>PO number</Label><Input value={order.poNumber} onChange={(e) => setOrder({ ...order, poNumber: e.target.value })} /></div>
            <div><Label>Approved request</Label><Select value={order.requestId} onChange={(e) => setOrder({ ...order, requestId: e.target.value })}><option value="">Select…</option>{approvedRequests.map((entry) => <option key={entry.id} value={entry.id}>{entry.id.slice(0, 8)}</option>)}</Select></div>
            <div><Label>Supplier</Label><Select value={order.supplierId} onChange={(e) => setOrder({ ...order, supplierId: e.target.value })}><option value="">Select…</option>{activeSuppliers.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</Select></div>
            <div><Label>Receiving store</Label><Select value={order.destinationStoreId} onChange={(e) => setOrder({ ...order, destinationStoreId: e.target.value })}><option value="">Select…</option>{storesQuery.data?.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</Select></div>
          </div>
          <div className="mt-4 space-y-2">{orderLines.map((line, index) => <div key={index} className="grid grid-cols-[1fr_8rem_10rem_auto] gap-2">
            <Select value={line.itemId} onChange={(e) => setOrderLines((rows) => rows.map((row, i) => i === index ? { ...row, itemId: e.target.value } : row))}><option value="">Item…</option>{itemsQuery.data?.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</Select>
            <Input type="number" min="1" placeholder="Quantity" value={line.quantity} onChange={(e) => setOrderLines((rows) => rows.map((row, i) => i === index ? { ...row, quantity: e.target.value } : row))} />
            <Input type="number" min="0.01" step="0.01" placeholder="Unit price" value={line.unitPrice} onChange={(e) => setOrderLines((rows) => rows.map((row, i) => i === index ? { ...row, unitPrice: e.target.value } : row))} />
            <Button variant="ghost" disabled={orderLines.length === 1} onClick={() => setOrderLines((rows) => rows.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button>
          </div>)}</div>
          <div className="mt-3 flex gap-2"><Button variant="secondary" size="sm" onClick={() => setOrderLines((rows) => [...rows, { itemId: '', quantity: '', unitPrice: '' }])}><Plus className="h-4 w-4" /> Add line</Button><Button size="sm" disabled={!order.poNumber || !order.requestId || !order.supplierId || !order.destinationStoreId || orderLines.some((line) => !line.itemId || !line.quantity || !line.unitPrice)} onClick={() => createOrder.mutate()}>Create order</Button></div>
          {createOrder.isError && <p className="mt-2 text-sm text-danger">{errorMessage(createOrder.error)}</p>}
        </CardBody></Card>
        <Card>{ordersQuery.data?.length === 0 ? <EmptyState icon={ShoppingCart} title="No purchase orders" /> : <table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted"><th className="px-5 py-3">PO</th><th>Supplier</th><th>Store</th><th>Lines</th><th>Status</th><th></th></tr></thead><tbody>{ordersQuery.data?.map((entry) => <tr key={entry.id} className="border-b last:border-0"><td className="px-5 py-3 font-medium">{entry.poNumber}</td><td>{entry.supplier.name}</td><td>{entry.destinationStore.name}</td><td>{entry.lines.length}</td><td><Badge tone={statusTone(entry.status)}>{entry.status}</Badge></td><td>{entry.status === 'DRAFT' && <Button size="sm" onClick={() => issueOrder.mutate(entry.id)}>Issue</Button>}</td></tr>)}</tbody></table>}</Card>
      </div>}

      {tab === 'receiving' && <Card className="max-w-3xl"><CardHeader><h2 className="font-medium">Record goods receipt</h2></CardHeader><CardBody>
        <div className="grid gap-3 sm:grid-cols-2"><div><Label>Purchase order</Label><Select value={receiptOrderId} onChange={(e) => { setReceiptOrderId(e.target.value); setReceiptQuantities({}); }}><option value="">Select issued order…</option>{receivableOrders.map((entry) => <option key={entry.id} value={entry.id}>{entry.poNumber}</option>)}</Select></div><div><Label>Receipt number</Label><Input value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} /></div></div>
        {selectedReceiptOrder && <div className="mt-4 space-y-2">{selectedReceiptOrder.lines.map((line) => <div key={line.id} className="grid grid-cols-[1fr_10rem] items-center gap-3 rounded border p-3"><div><p className="text-sm font-medium">{line.item.name}</p><p className="text-xs text-muted">Ordered {line.orderedQuantity}; received {line.receivedQuantity}; remaining {line.orderedQuantity - line.receivedQuantity}</p></div><Input type="number" min="0" max={line.orderedQuantity - line.receivedQuantity} placeholder="Accepted" value={receiptQuantities[line.id] ?? ''} onChange={(e) => setReceiptQuantities({ ...receiptQuantities, [line.id]: e.target.value })} /></div>)}</div>}
        <Button className="mt-4" disabled={!receiptOrderId || !receiptNumber || !Object.values(receiptQuantities).some((value) => Number(value) > 0) || receive.isPending} onClick={() => receive.mutate()}>Record receipt</Button>
        {receive.isError && <p className="mt-2 text-sm text-danger">{errorMessage(receive.error)}</p>}
        {receive.isSuccess && <p className="mt-2 text-sm text-success">Receipt recorded and inventory updated.</p>}
      </CardBody></Card>}
    </div>
  );
}
