import React from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input, Label, Select, Textarea } from '../ui/Input';
import { InventoryTrackingFields, InventoryTrackingValue } from './InventoryTrackingFields';
import { WarehouseMaterialPicker, WarehouseMaterial } from './WarehouseMaterialPicker';

interface Department {
  id: string;
  name: string;
  code: string;
}

interface TransferWorkspaceProps {
  materials?: WarehouseMaterial[];
  departments?: Department[];
  materialId: string;
  quantity: number;
  departmentId: string;
  purpose: string;
  remarks: string;
  tracking: InventoryTrackingValue;
  isKeeper: boolean;
  isPending: boolean;
  onMaterialChange: (value: string) => void;
  onQuantityChange: (value: number) => void;
  onDepartmentChange: (value: string) => void;
  onPurposeChange: (value: string) => void;
  onRemarksChange: (value: string) => void;
  onTrackingChange: (value: InventoryTrackingValue) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export function TransferWorkspace({
  materials,
  departments,
  materialId,
  quantity,
  departmentId,
  purpose,
  remarks,
  tracking,
  isKeeper,
  isPending,
  onMaterialChange,
  onQuantityChange,
  onDepartmentChange,
  onPurposeChange,
  onRemarksChange,
  onTrackingChange,
  onSubmit,
}: TransferWorkspaceProps) {
  const selectedMaterial = materials?.find((material) => material.id === materialId);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <WarehouseMaterialPicker
          materials={materials}
          value={materialId}
          onChange={onMaterialChange}
          label="Select material to transfer"
          placeholder="Scan barcode or search transfer item..."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label required>Quantity to Transfer</Label>
          <Input
            type="number"
            required
            min={1}
            value={quantity}
            onChange={(event) => onQuantityChange(Number(event.target.value))}
          />
        </div>

        <div>
          <Label required>Destination Department</Label>
          <Select required value={departmentId} onChange={(event) => onDepartmentChange(event.target.value)}>
            <option value="">Select Department...</option>
            {departments?.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name} ({department.code})
              </option>
            ))}
          </Select>
        </div>
      </div>

      <InventoryTrackingFields material={selectedMaterial} value={tracking} onChange={onTrackingChange} />

      <div>
        <Label>Purpose / Transfer Order</Label>
        <Input
          placeholder="e.g. Relocating computer monitors to Lab 3"
          value={purpose}
          onChange={(event) => onPurposeChange(event.target.value)}
        />
      </div>

      <div>
        <Label>Remarks</Label>
        <Textarea
          rows={2}
          placeholder="Transfer dispatch note or authorization code..."
          value={remarks}
          onChange={(event) => onRemarksChange(event.target.value)}
        />
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!isKeeper || isPending}
          isLoading={isPending}
          leftIcon={<ArrowRightLeft className="h-4 w-4" />}
        >
          Record Material Transfer
        </Button>
      </div>
    </form>
  );
}
