import React from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input, Label, Select, Textarea } from '../ui/Input';

interface Material {
  id: string;
  name: string;
  materialCode: string;
  unit: string;
  stockSummary?: { remainingQuantity?: number };
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface TransferWorkspaceProps {
  materials?: Material[];
  departments?: Department[];
  materialId: string;
  quantity: number;
  departmentId: string;
  purpose: string;
  remarks: string;
  isKeeper: boolean;
  isPending: boolean;
  onMaterialChange: (value: string) => void;
  onQuantityChange: (value: number) => void;
  onDepartmentChange: (value: string) => void;
  onPurposeChange: (value: string) => void;
  onRemarksChange: (value: string) => void;
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
  isKeeper,
  isPending,
  onMaterialChange,
  onQuantityChange,
  onDepartmentChange,
  onPurposeChange,
  onRemarksChange,
  onSubmit,
}: TransferWorkspaceProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label required>Select Material</Label>
        <Select required value={materialId} onChange={(event) => onMaterialChange(event.target.value)}>
          <option value="">Choose item to transfer...</option>
          {materials?.map((material) => (
            <option key={material.id} value={material.id}>
              {material.name} ({material.materialCode}) — Avail: {material.stockSummary?.remainingQuantity ?? 0}{' '}
              {material.unit}s
            </option>
          ))}
        </Select>
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
