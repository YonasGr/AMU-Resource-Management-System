import React from 'react';
import { ArrowDownLeft } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input, Label, Select, Textarea } from '../ui/Input';

interface Material {
  id: string;
  name: string;
  materialCode: string;
  unit: string;
  stockSummary?: { remainingQuantity?: number };
}

interface Supplier {
  id: string;
  name: string;
  supplierCode: string;
}

interface ReceivingWorkspaceProps {
  materials?: Material[];
  suppliers?: Supplier[];
  materialId: string;
  quantity: number;
  supplierId: string;
  deliveryReference: string;
  remarks: string;
  isKeeper: boolean;
  isPending: boolean;
  onMaterialChange: (value: string) => void;
  onQuantityChange: (value: number) => void;
  onSupplierChange: (value: string) => void;
  onDeliveryReferenceChange: (value: string) => void;
  onRemarksChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export function ReceivingWorkspace({
  materials,
  suppliers,
  materialId,
  quantity,
  supplierId,
  deliveryReference,
  remarks,
  isKeeper,
  isPending,
  onMaterialChange,
  onQuantityChange,
  onSupplierChange,
  onDeliveryReferenceChange,
  onRemarksChange,
  onSubmit,
}: ReceivingWorkspaceProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label required>Select Material</Label>
        <Select required value={materialId} onChange={(event) => onMaterialChange(event.target.value)}>
          <option value="">Choose received item...</option>
          {materials?.map((material) => (
            <option key={material.id} value={material.id}>
              {material.name} ({material.materialCode}) — Current: {material.stockSummary?.remainingQuantity ?? 0}{' '}
              {material.unit}s
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label required>Quantity Delivered</Label>
          <Input
            type="number"
            required
            min={1}
            value={quantity}
            onChange={(event) => onQuantityChange(Number(event.target.value))}
          />
        </div>

        <div>
          <Label>Delivery Reference</Label>
          <Input
            placeholder="Supplier delivery note or invoice reference"
            value={deliveryReference}
            onChange={(event) => onDeliveryReferenceChange(event.target.value)}
          />
        </div>
      </div>

      <div>
        <Label>Supplier / Vendor</Label>
        <Select value={supplierId} onChange={(event) => onSupplierChange(event.target.value)}>
          <option value="">Select Supplier (Optional)...</option>
          {suppliers?.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name} ({supplier.supplierCode})
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label>Inspection Notes</Label>
        <Input
          placeholder="Condition, packaging, or receiving notes"
          value={remarks}
          onChange={(event) => onRemarksChange(event.target.value)}
        />
      </div>

      <div>
        <Label>Additional Notes</Label>
        <Textarea
          rows={2}
          placeholder="Delivery invoice reference, box condition..."
          value={remarks}
          onChange={(event) => onRemarksChange(event.target.value)}
        />
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          variant="success"
          size="lg"
          className="w-full"
          disabled={!isKeeper || isPending}
          isLoading={isPending}
          leftIcon={<ArrowDownLeft className="h-4 w-4" />}
        >
          Create Draft for Independent Inspection
        </Button>
      </div>
    </form>
  );
}
