import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, PackageSearch, ScanLine, XCircle } from 'lucide-react';
import { Label } from '../ui/Input';

export interface WarehouseMaterial {
  id: string;
  name: string;
  materialCode: string;
  unit: string;
  barcode?: string;
  stockSummary?: { remainingQuantity?: number };
  requiresLotTracking?: boolean;
  requiresBatchTracking?: boolean;
  requiresExpiryTracking?: boolean;
  requiresSerialTracking?: boolean;
}

interface WarehouseMaterialPickerProps {
  materials?: WarehouseMaterial[];
  value: string;
  onChange: (materialId: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

type ScanState = { kind: 'idle' | 'success' | 'error'; message: string };

export function WarehouseMaterialPicker({
  materials = [],
  value,
  onChange,
  label = 'Material',
  placeholder = 'Scan barcode or search by material code...',
  required = true,
}: WarehouseMaterialPickerProps) {
  const [query, setQuery] = useState('');
  const [scanState, setScanState] = useState<ScanState>({ kind: 'idle', message: '' });
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastScanRef = useRef<{ value: string; at: number }>({ value: '', at: 0 });

  const selectedMaterial = materials.find((material) => material.id === value);
  const filteredMaterials = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return materials.slice(0, 8);
    return materials
      .filter((material) =>
        [material.name, material.materialCode, material.barcode]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(normalized)),
      )
      .slice(0, 8);
  }, [materials, query]);

  useEffect(() => {
    if (selectedMaterial && !query) {
      setScanState({ kind: 'success', message: `${selectedMaterial.name} selected` });
    }
  }, [selectedMaterial, query]);

  const selectMaterial = (material: WarehouseMaterial, source: 'scan' | 'search') => {
    onChange(material.id);
    setQuery('');
    setIsOpen(false);
    setScanState({
      kind: 'success',
      message: source === 'scan' ? `Scanned ${material.materialCode}` : `${material.name} selected`,
    });
  };

  const processScan = (rawValue: string) => {
    const scannedValue = rawValue.trim();
    if (!scannedValue) return;

    const now = Date.now();
    if (lastScanRef.current.value === scannedValue && now - lastScanRef.current.at < 800) {
      setScanState({ kind: 'success', message: 'Duplicate scan ignored' });
      return;
    }
    lastScanRef.current = { value: scannedValue, at: now };

    const normalized = scannedValue.toLowerCase();
    const material = materials.find(
      (candidate) =>
        candidate.barcode?.toLowerCase() === normalized ||
        candidate.materialCode.toLowerCase() === normalized,
    );

    if (!material) {
      setScanState({ kind: 'error', message: `No material matches “${scannedValue}”` });
      return;
    }

    selectMaterial(material, 'scan');
    navigator.vibrate?.(40);
  };

  return (
    <div className="space-y-1.5">
      <Label required={required}>{label}</Label>
      <div className="relative">
        <ScanLine className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-600" />
        <input
          ref={inputRef}
          required={required && !value}
          value={selectedMaterial ? `${selectedMaterial.name} (${selectedMaterial.materialCode})` : query}
          onChange={(event) => {
            if (selectedMaterial) onChange('');
            setQuery(event.target.value);
            setIsOpen(true);
            setScanState({ kind: 'idle', message: '' });
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              processScan(event.currentTarget.value);
            }
            if (event.key === 'Escape') {
              setIsOpen(false);
              inputRef.current?.blur();
            }
          }}
          onPaste={(event) => {
            const pasted = event.clipboardData.getData('text').trim();
            if (pasted && !pasted.includes('\n')) {
              event.preventDefault();
              processScan(pasted);
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls="warehouse-material-options"
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        />
        {value && (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onChange('');
              setQuery('');
              setScanState({ kind: 'idle', message: '' });
              inputRef.current?.focus();
            }}
            aria-label="Clear selected material"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <XCircle className="h-4 w-4" />
          </button>
        )}
        {isOpen && !selectedMaterial && (
          <div
            id="warehouse-material-options"
            role="listbox"
            className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
          >
            {filteredMaterials.length > 0 ? (
              filteredMaterials.map((material) => (
                <button
                  key={material.id}
                  type="button"
                  role="option"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectMaterial(material, 'search')}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-teal-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-slate-900">{material.name}</span>
                    <span className="block font-mono text-[11px] text-slate-500">
                      {material.materialCode}
                      {material.barcode ? ` · ${material.barcode}` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-slate-500">
                    {material.stockSummary?.remainingQuantity ?? 0} {material.unit}s
                  </span>
                </button>
              ))
            ) : (
              <p className="px-3 py-4 text-center text-xs text-slate-500">
                Press Enter after scanning a barcode or check the material code.
              </p>
            )}
          </div>
        )}
      </div>
      <div className="flex min-h-5 items-center gap-1.5 text-xs" aria-live="polite">
        {scanState.kind === 'success' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
        {scanState.kind === 'error' && <XCircle className="h-3.5 w-3.5 text-coral-600" />}
        {!scanState.message && <PackageSearch className="h-3.5 w-3.5 text-slate-400" />}
        <span className={scanState.kind === 'error' ? 'text-coral-600' : 'text-slate-500'}>
          {scanState.message || 'Scanner ready · type or scan, then press Enter'}
        </span>
      </div>
    </div>
  );
}
