import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// ─── Report row types ─────────────────────────────────────────────────────────

export interface InventoryRow {
  itemId: string;
  itemName: string;
  unit: string;
  storeId: string;
  storeName: string;
  quantity: number;
  minimumStock: number;
  belowMinimum: boolean;
}

export interface MovementRow {
  id: string;
  movementType: string;
  itemName: string;
  fromStore: string | null;
  toStore: string | null;
  quantity: number;
  referenceId: string | null;
  createdBy: string;
  createdAt: Date;
}

export interface ConsumptionRow {
  orgName: string;
  storeName: string;
  itemName: string;
  totalIssued: number;
}

export interface PurchaseRow {
  poNumber: string;
  supplier: string;
  status: string;
  destinationStore: string;
  itemName: string;
  orderedQty: number;
  receivedQty: number;
  unitPrice: string;
  currency: string;
  issuedAt: Date | null;
  expectedDeliveryDate: Date | null;
}

export interface TransferRow {
  referenceId: string | null;
  itemName: string;
  fromStore: string;
  toStore: string;
  quantity: number;
  createdBy: string;
  createdAt: Date;
}

export interface AssetRow {
  assetTag: string;
  serialNumber: string | null;
  itemName: string;
  storeName: string;
  status: string;
  condition: string;
  assignedOrg: string | null;
  purchaseDate: Date | null;
}

export interface UserActivityRow {
  userName: string;
  email: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: Date;
}

// ─── Date range helper ─────────────────────────────────────────────────────────
function dateFilter(from?: string, to?: string) {
  if (!from && !to) return undefined;
  return {
    ...(from ? { gte: new Date(from) } : {}),
    ...(to ? { lte: new Date(to) } : {}),
  };
}

@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService) {}

  async currentInventory(storeId?: string): Promise<InventoryRow[]> {
    const rows = await this.prisma.storeInventory.findMany({
      where: storeId ? { storeId } : undefined,
      include: {
        item: { select: { name: true, unit: true } },
        store: { select: { name: true } },
      },
      orderBy: [{ store: { name: 'asc' } }, { item: { name: 'asc' } }],
    });
    return rows.map((r) => ({
      itemId: r.itemId,
      itemName: r.item.name,
      unit: r.item.unit,
      storeId: r.storeId,
      storeName: r.store.name,
      quantity: r.quantity,
      minimumStock: r.minimumStock,
      belowMinimum: r.quantity < r.minimumStock,
    }));
  }

  async lowStock(storeId?: string): Promise<InventoryRow[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        item_id: string; item_name: string; unit: string;
        store_id: string; store_name: string;
        quantity: number; minimum_stock: number;
      }>
    >`
      SELECT si.item_id, i.name AS item_name, i.unit,
             si.store_id, s.name AS store_name,
             si.quantity, si.minimum_stock
      FROM store_inventory si
      JOIN items i ON i.id = si.item_id
      JOIN stores s ON s.id = si.store_id
      WHERE si.quantity < si.minimum_stock
        ${storeId ? this.prisma.$queryRaw`AND si.store_id = ${storeId}` : this.prisma.$queryRaw``}
      ORDER BY s.name, i.name
    `;
    return rows.map((r) => ({
      itemId: r.item_id,
      itemName: r.item_name,
      unit: r.unit,
      storeId: r.store_id,
      storeName: r.store_name,
      quantity: r.quantity,
      minimumStock: r.minimum_stock,
      belowMinimum: true,
    }));
  }

  async stockMovements(params: {
    from?: string;
    to?: string;
    storeId?: string;
    type?: string;
  }): Promise<MovementRow[]> {
    const rows = await this.prisma.inventoryMovement.findMany({
      where: {
        ...(params.type ? { movementType: params.type as any } : {}),
        ...(params.storeId
          ? { OR: [{ toStoreId: params.storeId }, { fromStoreId: params.storeId }] }
          : {}),
        ...(dateFilter(params.from, params.to)
          ? { createdAt: dateFilter(params.from, params.to) }
          : {}),
      },
      include: {
        item: { select: { name: true } },
        fromStore: { select: { name: true } },
        toStore: { select: { name: true } },
        createdBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });
    return rows.map((r) => ({
      id: r.id,
      movementType: r.movementType,
      itemName: r.item.name,
      fromStore: r.fromStore?.name ?? null,
      toStore: r.toStore?.name ?? null,
      quantity: r.quantity,
      referenceId: r.referenceId,
      createdBy: r.createdBy.fullName,
      createdAt: r.createdAt,
    }));
  }

  async departmentConsumption(params: {
    from?: string;
    to?: string;
    orgId?: string;
  }): Promise<ConsumptionRow[]> {
    const rows = await this.prisma.inventoryMovement.findMany({
      where: {
        movementType: 'ISSUE',
        ...(dateFilter(params.from, params.to)
          ? { createdAt: dateFilter(params.from, params.to) }
          : {}),
        ...(params.orgId
          ? { toStore: { organizationId: params.orgId } }
          : {}),
      },
      include: {
        item: { select: { name: true } },
        toStore: { select: { name: true, organization: { select: { name: true } } } },
      },
    });

    // Group by org + store + item
    const map = new Map<string, ConsumptionRow>();
    for (const r of rows) {
      if (!r.toStore) continue;
      const key = `${r.toStore.organization.name}::${r.toStore.name}::${r.item.name}`;
      const existing = map.get(key);
      if (existing) {
        existing.totalIssued += r.quantity;
      } else {
        map.set(key, {
          orgName: r.toStore.organization.name,
          storeName: r.toStore.name,
          itemName: r.item.name,
          totalIssued: r.quantity,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.orgName.localeCompare(b.orgName) || a.itemName.localeCompare(b.itemName),
    );
  }

  async purchaseReport(params: { from?: string; to?: string }): Promise<PurchaseRow[]> {
    const orders = await this.prisma.purchaseOrder.findMany({
      where: dateFilter(params.from, params.to)
        ? { createdAt: dateFilter(params.from, params.to) }
        : undefined,
      include: {
        supplier: { select: { name: true } },
        destinationStore: { select: { name: true } },
        lines: { include: { item: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows: PurchaseRow[] = [];
    for (const po of orders) {
      for (const line of po.lines) {
        rows.push({
          poNumber: po.poNumber,
          supplier: po.supplier.name,
          status: po.status,
          destinationStore: po.destinationStore.name,
          itemName: line.item.name,
          orderedQty: line.orderedQuantity,
          receivedQty: line.receivedQuantity,
          unitPrice: line.unitPrice.toString(),
          currency: po.currency,
          issuedAt: po.issuedAt,
          expectedDeliveryDate: po.expectedDeliveryDate,
        });
      }
    }
    return rows;
  }

  async transferReport(params: { from?: string; to?: string }): Promise<TransferRow[]> {
    const rows = await this.prisma.inventoryMovement.findMany({
      where: {
        movementType: 'TRANSFER_OUT',
        ...(dateFilter(params.from, params.to)
          ? { createdAt: dateFilter(params.from, params.to) }
          : {}),
      },
      include: {
        item: { select: { name: true } },
        fromStore: { select: { name: true } },
        toStore: { select: { name: true } },
        createdBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });
    return rows.map((r) => ({
      referenceId: r.referenceId,
      itemName: r.item.name,
      fromStore: r.fromStore?.name ?? '—',
      toStore: r.toStore?.name ?? '—',
      quantity: r.quantity,
      createdBy: r.createdBy.fullName,
      createdAt: r.createdAt,
    }));
  }

  async assetReport(params: { storeId?: string; status?: string }): Promise<AssetRow[]> {
    const rows = await this.prisma.asset.findMany({
      where: {
        ...(params.storeId ? { storeId: params.storeId } : {}),
        ...(params.status ? { status: params.status as any } : {}),
      },
      include: {
        item: { select: { name: true } },
        store: { select: { name: true } },
        assignedOrganization: { select: { name: true } },
      },
      orderBy: [{ store: { name: 'asc' } }, { assetTag: 'asc' }],
    });
    return rows.map((r) => ({
      assetTag: r.assetTag,
      serialNumber: r.serialNumber,
      itemName: r.item.name,
      storeName: r.store.name,
      status: r.status,
      condition: r.condition,
      assignedOrg: r.assignedOrganization?.name ?? null,
      purchaseDate: r.purchaseDate,
    }));
  }

  async userActivityReport(params: {
    from?: string;
    to?: string;
  }): Promise<UserActivityRow[]> {
    const rows = await this.prisma.auditLog.findMany({
      where: dateFilter(params.from, params.to)
        ? { createdAt: dateFilter(params.from, params.to) }
        : undefined,
      include: {
        actedBy: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });
    return rows.map((r) => ({
      userName: r.actedBy.fullName,
      email: r.actedBy.email,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      createdAt: r.createdAt,
    }));
  }

  // ─── Export helpers ─────────────────────────────────────────────────────────

  toCSV(rows: Record<string, unknown>[]): string {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const escape = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const lines = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
    ];
    return lines.join('\n');
  }

  /**
   * Generates a minimal but standards-compliant PDF using raw PDF syntax —
   * no external library dependency, following the same approach as
   * DisposalService.getCertificate(). Returns a Buffer.
   */
  toPDF(title: string, rows: Record<string, unknown>[]): Buffer {
    if (rows.length === 0) {
      return this.buildPDF(title, ['No data available for the selected filters.'], []);
    }
    const headers = Object.keys(rows[0]);
    const dataLines = rows.slice(0, 500).map((r) =>
      headers.map((h) => String(r[h] ?? '')).join('  |  '),
    );
    return this.buildPDF(title, [
      `Total records: ${rows.length}${rows.length > 500 ? ' (showing first 500)' : ''}`,
    ], [headers.join('  |  '), ...dataLines]);
  }

  private buildPDF(title: string, meta: string[], lines: string[]): Buffer {
    const now = new Date().toUTCString();
    const textObjects: string[] = [];

    const addLine = (text: string, y: number, size = 10) => {
      textObjects.push(
        `BT /F1 ${size} Tf 40 ${y} Td (${text.replace(/[()\\]/g, '\\$&').slice(0, 120)}) Tj ET`,
      );
    };

    let y = 750;
    addLine(title, y, 16);
    y -= 20;
    addLine(`Generated: ${now}`, y, 9);
    y -= 10;
    addLine('—'.repeat(80), y, 8);
    y -= 15;

    for (const m of meta) {
      addLine(m, y, 9);
      y -= 13;
    }
    y -= 5;

    for (const line of lines) {
      if (y < 60) {
        y = 750;
        textObjects.push('showpage');
      }
      addLine(line, y, 8);
      y -= 11;
    }

    const content = `BT\n${textObjects.join('\n')}\nET`;
    const streamData = content;
    const streamLen = Buffer.byteLength(streamData, 'latin1');

    const objects = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842]\n   /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj`,
      `4 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamData}\nendstream\nendobj`,
      '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
    ];

    const header = '%PDF-1.4\n';
    let body = header;
    const offsets: number[] = [];
    for (const obj of objects) {
      offsets.push(Buffer.byteLength(body, 'latin1'));
      body += obj + '\n';
    }

    const xrefOffset = Buffer.byteLength(body, 'latin1');
    body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const off of offsets) {
      body += String(off).padStart(10, '0') + ' 00000 n \n';
    }
    body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

    return Buffer.from(body, 'latin1');
  }
}
