import { useMemo, useState } from "react";
import { ClipboardPaste, ListPlus, Play, ScanLine, Trash2 } from "lucide-react";
import { Button } from "../ui/Button";
import { Textarea } from "../ui/Input";
import type { WarehouseMaterial } from "./WarehouseMaterialPicker";

export type BatchMovementOperation = "RECEIPT" | "STOCK_OUT" | "TRANSFER";

export interface BatchMovementLine {
  materialId: string;
  materialCode: string;
  quantity: number;
  idempotencyKey: string;
  lotNumber?: string;
  batchNumber?: string;
  expiryDate?: string;
  serialNumber?: string;
}

interface BatchMovementQueueProps {
  operation: BatchMovementOperation;
  materials?: WarehouseMaterial[];
  supplierId?: string;
  employeeId?: string;
  departmentId?: string;
  sourceStoreId?: string;
  destinationStoreId?: string;
  onSubmit: (lines: BatchMovementLine[]) => Promise<BatchMovementResult>;
  isPending: boolean;
}

export interface BatchMovementResult {
  results?: Array<{ index: number; status: "SUCCEEDED" | "FAILED" }>;
}

function makeKey() {
  return `batch-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function BatchMovementQueue({
  operation,
  materials = [],
  supplierId,
  employeeId,
  departmentId,
  sourceStoreId,
  destinationStoreId,
  onSubmit,
  isPending,
}: BatchMovementQueueProps) {
  const [scanValue, setScanValue] = useState("");
  const [pasteValue, setPasteValue] = useState("");
  const [lines, setLines] = useState<BatchMovementLine[]>([]);
  const [message, setMessage] = useState("");

  const materialByCode = useMemo(
    () =>
      new Map(
        materials.flatMap((material) => [
          [material.materialCode.toLowerCase(), material],
          ...(material.barcode
            ? [[material.barcode.toLowerCase(), material] as const]
            : []),
        ]),
      ),
    [materials],
  );

  const addLine = (
    rawCode: string,
    quantity = 1,
    tracking: Partial<BatchMovementLine> = {},
  ) => {
    const material = materialByCode.get(rawCode.trim().toLowerCase());
    if (!material) {
      setMessage(`No material matches “${rawCode.trim()}”.`);
      return;
    }
    setLines((current) => [
      ...current,
      {
        materialId: material.id,
        materialCode: material.materialCode,
        quantity,
        idempotencyKey: makeKey(),
        ...tracking,
      },
    ]);
    setMessage(`${material.materialCode} added to the queue.`);
  };

  const parsePaste = () => {
    const parsed = pasteValue
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.split(/[,\t]/).map((value) => value.trim()));
    let added = 0;
    parsed.forEach(
      ([
        code,
        quantity = "1",
        lotNumber,
        batchNumber,
        expiryDate,
        serialNumber,
      ]) => {
        const material = materialByCode.get(code?.toLowerCase());
        const parsedQuantity = Number(quantity);
        if (
          material &&
          Number.isInteger(parsedQuantity) &&
          parsedQuantity > 0
        ) {
          setLines((current) => [
            ...current,
            {
              materialId: material.id,
              materialCode: material.materialCode,
              quantity: parsedQuantity,
              idempotencyKey: makeKey(),
              lotNumber: lotNumber || undefined,
              batchNumber: batchNumber || undefined,
              expiryDate: expiryDate || undefined,
              serialNumber: serialNumber || undefined,
            },
          ]);
          added += 1;
        }
      },
    );
    setMessage(
      `${added} line${added === 1 ? "" : "s"} added. Invalid rows were skipped.`,
    );
    setPasteValue("");
  };

  return (
    <section className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <ListPlus className="h-4 w-4 text-teal-700" />
            Batch scan queue
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Add repeated lines, then post them with per-line success and retry
            results.
          </p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600">
          {lines.length} queued
        </span>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-700" />
          <input
            autoComplete="off"
            value={scanValue}
            onChange={(event) => setScanValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addLine(scanValue);
                setScanValue("");
              }
            }}
            placeholder="Scan material code, press Enter, repeat..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
          <ClipboardPaste className="h-3.5 w-3.5" />
          Controlled bulk paste
        </label>
        <Textarea
          rows={3}
          value={pasteValue}
          onChange={(event) => setPasteValue(event.target.value)}
          placeholder="One row per line: MATERIAL_CODE, quantity, lot, batch, expiry (optional), serial (optional)"
        />
        <div className="mt-2 flex justify-end">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={parsePaste}
            disabled={!pasteValue.trim()}
          >
            Add pasted lines
          </Button>
        </div>
      </div>

      {lines.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-2">Material</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2">Traceability</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((line, index) => (
                <tr key={line.idempotencyKey}>
                  <td className="px-3 py-2 font-mono font-bold text-slate-800">
                    {line.materialCode}
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-slate-900">
                    {line.quantity}
                  </td>
                  <td className="px-3 py-2 text-slate-500">
                    {[
                      line.lotNumber,
                      line.batchNumber,
                      line.expiryDate,
                      line.serialNumber,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      aria-label={`Remove line ${index + 1}`}
                      onClick={() =>
                        setLines((current) =>
                          current.filter((_, lineIndex) => lineIndex !== index),
                        )
                      }
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-coral-50 hover:text-coral-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500" aria-live="polite">
          {message ||
            "Each line receives its own idempotency key for safe retry."}
        </p>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={lines.length === 0 || isPending}
          isLoading={isPending}
          leftIcon={<Play className="h-3.5 w-3.5" />}
          onClick={async () => {
            const submittedLines = lines;
            try {
              const result = await onSubmit(submittedLines);
              const failedIndexes = new Set(
                (result.results ?? [])
                  .filter((line) => line.status === "FAILED")
                  .map((line) => line.index),
              );
              setLines(
                submittedLines.filter((_, index) => failedIndexes.has(index)),
              );
              setMessage(
                failedIndexes.size
                  ? `${failedIndexes.size} failed line${failedIndexes.size === 1 ? "" : "s"} retained for retry.`
                  : "All queued lines posted successfully.",
              );
            } catch {
              setMessage(
                "The batch could not be posted. All queued lines were retained for retry.",
              );
            }
          }}
        >
          Post queued lines
        </Button>
      </div>
    </section>
  );
}
