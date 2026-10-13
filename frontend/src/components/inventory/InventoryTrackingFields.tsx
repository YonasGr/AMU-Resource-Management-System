import { Input, Label } from '../ui/Input';
import type { WarehouseMaterial } from './WarehouseMaterialPicker';

export interface InventoryTrackingValue {
  lotNumber: string;
  batchNumber: string;
  expiryDate: string;
  serialNumber: string;
}

interface InventoryTrackingFieldsProps {
  material?: WarehouseMaterial;
  value: InventoryTrackingValue;
  onChange: (value: InventoryTrackingValue) => void;
}

export function InventoryTrackingFields({ material, value, onChange }: InventoryTrackingFieldsProps) {
  if (!material) return null;

  const requiresLot = material.requiresLotTracking;
  const requiresBatch = material.requiresBatchTracking;
  const requiresExpiry = material.requiresExpiryTracking;
  const requiresSerial = material.requiresSerialTracking;

  if (!requiresLot && !requiresBatch && !requiresExpiry && !requiresSerial) return null;

  const update = (field: keyof InventoryTrackingValue, fieldValue: string) =>
    onChange({ ...value, [field]: fieldValue });

  return (
    <div className="space-y-3 rounded-xl border border-teal-100 bg-teal-50/40 p-4" aria-live="polite">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-teal-800">Traceability details</p>
        <p className="mt-1 text-xs text-teal-700">
          This item requires additional tracking before the movement can be posted.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {requiresLot && (
          <div>
            <Label required>Lot number</Label>
            <Input
              required
              value={value.lotNumber}
              placeholder="Scan or enter lot"
              onChange={(event) => update('lotNumber', event.target.value)}
            />
          </div>
        )}
        {requiresBatch && (
          <div>
            <Label required>Batch number</Label>
            <Input
              required
              value={value.batchNumber}
              placeholder="Scan or enter batch"
              onChange={(event) => update('batchNumber', event.target.value)}
            />
          </div>
        )}
        {requiresExpiry && (
          <div>
            <Label required>Expiry date</Label>
            <Input
              required
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              value={value.expiryDate}
              onChange={(event) => update('expiryDate', event.target.value)}
            />
          </div>
        )}
        {requiresSerial && (
          <div>
            <Label required>Serial number</Label>
            <Input
              required
              value={value.serialNumber}
              placeholder="One serial per movement"
              onChange={(event) => update('serialNumber', event.target.value)}
            />
            <p className="mt-1 text-[11px] text-slate-500">Serial-tracked movements accept one unit at a time.</p>
          </div>
        )}
      </div>
    </div>
  );
}
