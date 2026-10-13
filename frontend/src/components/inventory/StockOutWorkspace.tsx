import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input, Label, Select, Textarea } from '../ui/Input';
import { InventoryTrackingFields, InventoryTrackingValue } from './InventoryTrackingFields';
import { WarehouseMaterialPicker, WarehouseMaterial } from './WarehouseMaterialPicker';

interface Employee {
  id: string;
  fullName: string;
  department?: { name?: string };
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface StockOutWorkspaceProps {
  materials?: WarehouseMaterial[];
  employees?: Employee[];
  departments?: Department[];
  materialId: string;
  quantity: number;
  employeeId: string;
  departmentId: string;
  purpose: string;
  remarks: string;
  tracking: InventoryTrackingValue;
  isKeeper: boolean;
  isPending: boolean;
  onMaterialChange: (value: string) => void;
  onQuantityChange: (value: number) => void;
  onEmployeeChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  onPurposeChange: (value: string) => void;
  onRemarksChange: (value: string) => void;
  onTrackingChange: (value: InventoryTrackingValue) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export function StockOutWorkspace({
  materials,
  employees,
  departments,
  materialId,
  quantity,
  employeeId,
  departmentId,
  purpose,
  remarks,
  tracking,
  isKeeper,
  isPending,
  onMaterialChange,
  onQuantityChange,
  onEmployeeChange,
  onDepartmentChange,
  onPurposeChange,
  onRemarksChange,
  onTrackingChange,
  onSubmit,
}: StockOutWorkspaceProps) {
  const selectedMaterial = materials?.find((material) => material.id === materialId);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <WarehouseMaterialPicker
          materials={materials}
          value={materialId}
          onChange={onMaterialChange}
          label="Select material to issue"
          placeholder="Scan barcode or search item to issue..."
        />
      </div>

      <div>
        <Label required>Quantity to Issue</Label>
        <Input
          type="number"
          required
          min={1}
          value={quantity}
          onChange={(event) => onQuantityChange(Number(event.target.value))}
        />
      </div>

      <InventoryTrackingFields material={selectedMaterial} value={tracking} onChange={onTrackingChange} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Recipient Employee</Label>
          <Select value={employeeId} onChange={(event) => onEmployeeChange(event.target.value)}>
            <option value="">Select Employee...</option>
            {employees?.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.fullName} ({employee.department?.name})
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label>Recipient Department</Label>
          <Select value={departmentId} onChange={(event) => onDepartmentChange(event.target.value)}>
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
        <Label>Purpose of Direct Issue</Label>
        <Input
          placeholder="e.g. Department office workstation setup"
          value={purpose}
          onChange={(event) => onPurposeChange(event.target.value)}
        />
      </div>

      <div>
        <Label>Remarks</Label>
        <Textarea
          rows={2}
          placeholder="Storekeeper notes or authorization code..."
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
          leftIcon={<ArrowUpRight className="h-4 w-4" />}
        >
          Confirm Stock Out & Issue
        </Button>
      </div>
    </form>
  );
}
