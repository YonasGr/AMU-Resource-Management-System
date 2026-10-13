import React from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input, Label, Select, Textarea } from '../ui/Input';
import { InventoryTrackingFields, InventoryTrackingValue } from './InventoryTrackingFields';
import { WarehouseMaterial } from './WarehouseMaterialPicker';

export interface ReturnableItem {
  id: string;
  materialId: string;
  quantityIssued: number;
  quantityReturned?: number;
  material?: { name?: string; materialCode?: string };
}

export interface IssuedRequest {
  id: string;
  requestNumber: string;
  departmentId?: string;
  requester?: { fullName?: string };
  department?: { name?: string };
  items?: ReturnableItem[];
}

interface ReturnsWorkspaceProps {
  issuedRequests?: IssuedRequest[];
  selectedItem?: ReturnableItem;
  returnableItems: ReturnableItem[];
  returnableQuantity: number;
  requestId: string;
  requestItemId: string;
  quantity: number;
  remarks: string;
  materials?: WarehouseMaterial[];
  tracking: InventoryTrackingValue;
  isKeeper: boolean;
  isPending: boolean;
  onRequestChange: (requestId: string) => void;
  onItemChange: (itemId: string) => void;
  onQuantityChange: (quantity: number) => void;
  onRemarksChange: (remarks: string) => void;
  onTrackingChange: (value: InventoryTrackingValue) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export function ReturnsWorkspace({
  issuedRequests,
  selectedItem,
  returnableItems,
  returnableQuantity,
  requestId,
  requestItemId,
  quantity,
  remarks,
  materials,
  tracking,
  isKeeper,
  isPending,
  onRequestChange,
  onItemChange,
  onQuantityChange,
  onRemarksChange,
  onTrackingChange,
  onSubmit,
}: ReturnsWorkspaceProps) {
  const selectedMaterial = materials?.find((material) => material.id === selectedItem?.materialId);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label required>Original Issued Request</Label>
        <Select required value={requestId} onChange={(event) => onRequestChange(event.target.value)}>
          <option value="">Choose an issued request...</option>
          {issuedRequests?.map((request) => (
            <option key={request.id} value={request.id}>
              {request.requestNumber} — {request.requester?.fullName || 'Requester'} (
              {request.department?.name || 'Department'})
            </option>
          ))}
        </Select>
        {issuedRequests?.length === 0 && (
          <p className="mt-2 text-xs font-medium text-slate-500">
            No issued requests have an outstanding quantity to return.
          </p>
        )}
      </div>

      {requestId && (
        <>
          <div>
            <Label required>Issued Material</Label>
            <Select required value={requestItemId} onChange={(event) => onItemChange(event.target.value)}>
              <option value="">Choose a material from this request...</option>
              {returnableItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.material?.name} ({item.material?.materialCode}) —{' '}
                  {item.quantityIssued - (item.quantityReturned ?? 0)} eligible
                </option>
              ))}
            </Select>
            {returnableItems.length === 0 && (
              <p className="mt-2 text-xs font-medium text-slate-500">
                All issued items on this request have already been returned.
              </p>
            )}

            <InventoryTrackingFields material={selectedMaterial} value={tracking} onChange={onTrackingChange} />
          </div>

          {selectedItem && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              <p className="font-semibold">{selectedItem.material?.name}</p>
              <p className="mt-1 text-xs">
                Issued: {selectedItem.quantityIssued} · Returned: {selectedItem.quantityReturned ?? 0} · Still
                eligible: {returnableQuantity}
              </p>
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
          value={quantity}
          onChange={(event) => onQuantityChange(Number(event.target.value))}
        />
      </div>

      <div>
        <Label>Reason & Condition Remarks</Label>
        <Textarea
          rows={2}
          placeholder="e.g. Unused items returned in original unopened packaging"
          value={remarks}
          onChange={(event) => onRemarksChange(event.target.value)}
        />
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full bg-amber-600 text-white hover:bg-amber-700"
          disabled={!isKeeper || isPending || !selectedItem || quantity < 1 || quantity > returnableQuantity}
          isLoading={isPending}
          leftIcon={<RotateCcw className="h-4 w-4" />}
        >
          Confirm Return to Store
        </Button>
      </div>
    </form>
  );
}
