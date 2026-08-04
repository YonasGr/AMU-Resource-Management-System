import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select, Label } from '../../components/ui/Input';

interface Item {
  id: string;
  name: string;
  unit: string;
}
interface Store {
  id: string;
  name: string;
}

export default function NewRequestPage() {
  const navigate = useNavigate();
  const [type, setType] = useState<'ITEM_REQUEST' | 'TRANSFER_REQUEST' | 'PURCHASE_REQUEST'>('ITEM_REQUEST');
  const [itemId, setItemId] = useState('');
  const [targetStoreId, setTargetStoreId] = useState('');
  const [sourceStoreId, setSourceStoreId] = useState('');
  const [destinationStoreId, setDestinationStoreId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [purchaseLines, setPurchaseLines] = useState([{ itemId: '', quantity: '' }]);

  const { data: items } = useQuery({
    queryKey: ['items-for-request'],
    queryFn: async () => (await api.get<{ data: Item[] }>('/items')).data.data,
  });
  const { data: stores } = useQuery({
    queryKey: ['stores-for-request'],
    queryFn: async () => (await api.get<{ data: Store[] }>('/stores/directory')).data.data,
  });

  const createMutation = useMutation({
    mutationFn: async (): Promise<any> =>
      type === 'ITEM_REQUEST'
        ? api.post('/requests/item-request', {
            itemId,
            targetStoreId,
            quantity: Number(quantity),
            notes: notes || undefined,
          })
        : type === 'TRANSFER_REQUEST' ? api.post('/requests/transfer-request', {
            itemId,
            sourceStoreId,
            destinationStoreId,
            quantity: Number(quantity),
            notes: notes || undefined,
          }) : api.post('/requests/purchase-request', {
            lines: purchaseLines.map((line) => ({
              itemId: line.itemId,
              quantity: Number(line.quantity),
            })),
            notes: notes || undefined,
          }),
    onSuccess: (res) => navigate(`/requests/${res.data.data.id}`),
  });

  const canSubmit =
    type === 'PURCHASE_REQUEST'
      ? purchaseLines.length > 0 && purchaseLines.every((line) => line.itemId && Number(line.quantity) > 0)
      : itemId && quantity &&
        (type === 'ITEM_REQUEST' ? targetStoreId : sourceStoreId && destinationStoreId && sourceStoreId !== destinationStoreId);

  return (
    <div>
      <Link to="/requests" className="mb-4 flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to requests
      </Link>
      <PageHeader title="New Request" description="This creates a draft — you'll submit it on the next screen to start the approval chain." />

      <Card className="max-w-2xl">
        <CardBody>
          <div className="mb-5 flex gap-2">
            <button
              onClick={() => setType('ITEM_REQUEST')}
              className={`flex-1 rounded-md border px-4 py-2.5 text-sm font-medium ${type === 'ITEM_REQUEST' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted'}`}
            >
              Item Request
            </button>
            <button
              onClick={() => setType('TRANSFER_REQUEST')}
              className={`flex-1 rounded-md border px-4 py-2.5 text-sm font-medium ${type === 'TRANSFER_REQUEST' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted'}`}
            >
              Transfer Request
            </button>
            <button
              onClick={() => setType('PURCHASE_REQUEST')}
              className={`flex-1 rounded-md border px-4 py-2.5 text-sm font-medium ${type === 'PURCHASE_REQUEST' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted'}`}
            >
              Purchase Request
            </button>
          </div>

          <div className="space-y-4">
            {type !== 'PURCHASE_REQUEST' && <div>
              <Label>Item</Label>
              <Select value={itemId} onChange={(e) => setItemId(e.target.value)}>
                <option value="">Select an item…</option>
                {items?.map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </Select>
            </div>}

            {type === 'ITEM_REQUEST' ? (
              <div>
                <Label>Issue from store</Label>
                <Select value={targetStoreId} onChange={(e) => setTargetStoreId(e.target.value)}>
                  <option value="">Select a store…</option>
                  {stores?.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </div>
            ) : type === 'TRANSFER_REQUEST' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>From store</Label>
                  <Select value={sourceStoreId} onChange={(e) => setSourceStoreId(e.target.value)}>
                    <option value="">Select a store…</option>
                    {stores?.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>To store</Label>
                  <Select value={destinationStoreId} onChange={(e) => setDestinationStoreId(e.target.value)}>
                    <option value="">Select a store…</option>
                    {stores?.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Select>
                </div>
              </div>
            ) : (
              <div>
                <Label>Requested items</Label>
                <div className="space-y-2">
                  {purchaseLines.map((line, index) => (
                    <div key={index} className="grid grid-cols-[1fr_9rem_auto] gap-2">
                      <Select
                        value={line.itemId}
                        onChange={(e) => setPurchaseLines((current) => current.map((entry, i) =>
                          i === index ? { ...entry, itemId: e.target.value } : entry))}
                      >
                        <option value="">Select an item…</option>
                        {items?.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </Select>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Quantity"
                        value={line.quantity}
                        onChange={(e) => setPurchaseLines((current) => current.map((entry, i) =>
                          i === index ? { ...entry, quantity: e.target.value } : entry))}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={purchaseLines.length === 1}
                        onClick={() => setPurchaseLines((current) => current.filter((_, i) => i !== index))}
                      ><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                  onClick={() => setPurchaseLines((current) => [...current, { itemId: '', quantity: '' }])}
                ><Plus className="h-4 w-4" /> Add item</Button>
              </div>
            )}

            {type !== 'PURCHASE_REQUEST' && <div>
              <Label>Quantity</Label>
              <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="10" />
            </div>}

            <div>
              <Label>Notes (optional)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Why do you need this?" />
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Button disabled={!canSubmit || createMutation.isPending} onClick={() => createMutation.mutate()}>
              Create draft
            </Button>
            {createMutation.isError && (
              <span className="text-sm text-danger">
                {(createMutation.error as any)?.response?.data?.message ?? 'Could not create request.'}
              </span>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
