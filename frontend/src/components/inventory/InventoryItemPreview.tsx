import { Package, Sparkles } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Card, CardBody, CardHeader, CardTitle } from '../ui/Card';

interface InventoryMaterial {
  materialCode: string;
  name: string;
  description?: string;
  unit: string;
  minimumStock: number;
  location?: string;
  category?: { name?: string };
  stockSummary?: {
    remainingQuantity?: number;
    quantityReceived?: number;
    quantityIssued?: number;
  };
}

interface InventoryItemPreviewProps {
  material?: InventoryMaterial;
}

export function InventoryItemPreview({ material }: InventoryItemPreviewProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <Sparkles className="h-4 w-4" />
          </div>
          <CardTitle>Selected Item Preview</CardTitle>
        </div>
      </CardHeader>

      <CardBody className="space-y-4">
        {material ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-teal-200/80 bg-teal-50/50 p-4">
              <div className="flex items-center justify-between">
                <span className="rounded-lg border border-teal-200 bg-white px-2.5 py-1 font-mono text-xs font-bold text-teal-900">
                  {material.materialCode}
                </span>
                <Badge tone="teal" withDot={false}>
                  {material.category?.name || 'General'}
                </Badge>
              </div>
              <h4 className="mt-3 text-base font-extrabold text-slate-900">{material.name}</h4>
              <p className="mt-1 text-xs text-slate-500">{material.description || 'No description provided'}</p>
            </div>

            <div className="space-y-2 text-xs">
              <PreviewRow label="Current Remaining" value={`${material.stockSummary?.remainingQuantity ?? 0} ${material.unit}s`} strong />
              <PreviewRow label="Total Stock Received" value={`${material.stockSummary?.quantityReceived ?? 0} ${material.unit}s`} />
              <PreviewRow label="Total Stock Issued" value={`${material.stockSummary?.quantityIssued ?? 0} ${material.unit}s`} />
              <PreviewRow label="Min Alert Limit" value={`${material.minimumStock} ${material.unit}s`} valueClassName="text-coral-600" />
              <PreviewRow label="Store Shelf Location" value={material.location || 'Central Store'} last />
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-slate-400">
            <Package className="mx-auto mb-2 h-10 w-10 text-slate-300" />
            Select a material from the dropdown to see live inventory balance and shelf location.
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function PreviewRow({
  label,
  value,
  strong = false,
  valueClassName = 'text-slate-700',
  last = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  valueClassName?: string;
  last?: boolean;
}) {
  return (
    <div className={`flex justify-between py-2 ${last ? '' : 'border-b border-slate-100'}`}>
      <span className="text-slate-500">{label}:</span>
      <span className={`${strong ? 'font-bold text-slate-900' : 'font-semibold'} ${valueClassName}`}>{value}</span>
    </div>
  );
}
