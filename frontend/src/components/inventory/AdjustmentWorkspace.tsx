import React from 'react';
import { Sliders } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input, Label, Select, Textarea } from '../ui/Input';

interface Material {
  id: string;
  name: string;
  materialCode: string;
  unit: string;
  stockSummary?: { remainingQuantity?: number };
}

interface AdjustmentWorkspaceProps {
  materials?: Material[];
  materialId: string;
  newQuantity: number;
  reasonCode: string;
  remarks: string;
  breakGlass: boolean;
  canAdjust: boolean;
  isAdministrator: boolean;
  isPending: boolean;
  onMaterialChange: (value: string) => void;
  onQuantityChange: (value: number) => void;
  onReasonCodeChange: (value: string) => void;
  onRemarksChange: (value: string) => void;
  onBreakGlassChange: (value: boolean) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export function AdjustmentWorkspace({
  materials,
  materialId,
  newQuantity,
  reasonCode,
  remarks,
  breakGlass,
  canAdjust,
  isAdministrator,
  isPending,
  onMaterialChange,
  onQuantityChange,
  onReasonCodeChange,
  onRemarksChange,
  onBreakGlassChange,
  onSubmit,
}: AdjustmentWorkspaceProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label required>Select Material to Adjust</Label>
        <Select required value={materialId} onChange={(event) => onMaterialChange(event.target.value)}>
          <option value="">Choose item for audit adjustment...</option>
          {materials?.map((material) => (
            <option key={material.id} value={material.id}>
              {material.name} ({material.materialCode}) — Current System Stock:{' '}
              {material.stockSummary?.remainingQuantity ?? 0} {material.unit}s
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
          onChange={(event) => onQuantityChange(Number(event.target.value))}
        />
      </div>

      <div>
        <Label required>Adjustment Reason Code</Label>
        <Select required value={reasonCode} onChange={(event) => onReasonCodeChange(event.target.value)}>
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
          value={remarks}
          onChange={(event) => onRemarksChange(event.target.value)}
        />
      </div>

      {isAdministrator && (
        <label className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <input
            type="checkbox"
            checked={breakGlass}
            onChange={(event) => onBreakGlassChange(event.target.checked)}
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
          className="w-full bg-purple-600 text-white hover:bg-purple-700"
          disabled={!canAdjust || isPending}
          isLoading={isPending}
          leftIcon={<Sliders className="h-4 w-4" />}
        >
          Confirm Stock Count Adjustment
        </Button>
      </div>
    </form>
  );
}
