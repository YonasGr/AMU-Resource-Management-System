import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input, Label, Select, Textarea } from '../ui/Input';

interface Material {
  id: string;
  name: string;
  materialCode: string;
  unit: string;
  stockSummary?: { remainingQuantity?: number };
}

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
  materials?: Material[];
  employees?: Employee[];
  departments?: Department[];
  materialId: string;
  quantity: number;
  employeeId: string;
  departmentId: string;
  purpose: string;
  remarks: string;
  isKeeper: boolean;
  isPending: boolean;
  onMaterialChange: (value: string) => void;
  onQuantityChange: (value: number) => void;
  onEmployeeChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  onPurposeChange: (value: string) => void;
  onRemarksChange: (value: string) => void;
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
  isKeeper,
  isPending,
  onMaterialChange,
  onQuantityChange,
  onEmployeeChange,
  onDepartmentChange,
  onPurposeChange,
  onRemarksChange,
  onSubmit,
}: StockOutWorkspaceProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label required>Select Material</Label>
        <Select required value={materialId} onChange={(event) => onMaterialChange(event.target.value)}>
          <option value="">Choose item to issue...</option>
          {materials?.map((material) => (
            <option key={material.id} value={material.id}>
              {material.name} ({material.materialCode}) — Avail: {material.stockSummary?.remainingQuantity ?? 0}{' '}
              {material.unit}s
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
          onChange={(event) => onQuantityChange(Number(event.target.value))}
        />
      </div>

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
