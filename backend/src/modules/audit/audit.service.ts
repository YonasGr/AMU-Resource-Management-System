import { Injectable } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditEvent {
  id: string;
  source: 'AUDIT_LOG' | 'APPROVAL_HISTORY' | 'INVENTORY_MOVEMENT' | 'ASSET_HISTORY';
  entityType: string;
  entityId: string;
  action: string;
  description: string;
  actedBy: { id: string; fullName: string; email: string };
  createdAt: Date;
  before?: unknown;
  after?: unknown;
}

export interface AuditFilters {
  entityType?: string;
  entityId?: string;
  actedById?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

/**
 * Unified audit query layer. Merges four implicit audit trails:
 *   1. AuditLog       — admin/config events (login, role assignment, …)
 *   2. ApprovalHistory — every approval/rejection in any workflow
 *   3. InventoryMovement — every stock change with its justification
 *   4. AssetHistory   — every asset lifecycle event
 *
 * Results are sorted newest-first across all sources.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Internal helper — called by other services to record admin events.
   * Never throws; an audit-log failure must never block the primary action.
   */
  async log(
    entityType: string,
    entityId: string,
    action: AuditAction,
    actedById: string,
    before?: unknown,
    after?: unknown,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          entityType,
          entityId,
          action,
          actedById,
          before: before ? (before as object) : undefined,
          after: after ? (after as object) : undefined,
        },
      });
    } catch {
      // Intentional swallow — audit failure must not break the caller.
    }
  }

  /** Paginated unified audit timeline across all four sources. */
  async findAll(filters: AuditFilters): Promise<{ data: AuditEvent[]; total: number }> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(200, Math.max(1, filters.limit ?? 50));
    const fromDate = filters.from ? new Date(filters.from) : undefined;
    const toDate = filters.to ? new Date(filters.to) : undefined;

    // ── 1. AuditLog ──────────────────────────────────────────────────────────
    const auditWhere = {
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.entityId ? { entityId: filters.entityId } : {}),
      ...(filters.actedById ? { actedById: filters.actedById } : {}),
      ...(fromDate || toDate
        ? { createdAt: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } }
        : {}),
    };

    const auditLogs = await this.prisma.auditLog.findMany({
      where: auditWhere,
      include: { actedBy: { select: { id: true, fullName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // ── 2. ApprovalHistory ───────────────────────────────────────────────────
    const approvalWhere = {
      ...(filters.actedById ? { actedById: filters.actedById } : {}),
      ...(fromDate || toDate
        ? { createdAt: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } }
        : {}),
      // entityType/entityId filtering: check instance's entity fields
      ...(filters.entityType || filters.entityId
        ? {
            workflowInstance: {
              ...(filters.entityType ? { entityType: filters.entityType } : {}),
              ...(filters.entityId ? { entityId: filters.entityId } : {}),
            },
          }
        : {}),
    };

    const approvals = await this.prisma.approvalHistory.findMany({
      where: approvalWhere,
      include: {
        actedBy: { select: { id: true, fullName: true, email: true } },
        workflowInstance: { select: { entityType: true, entityId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // ── 3. InventoryMovement ─────────────────────────────────────────────────
    // Only include if entityType filter is 'InventoryMovement' or 'Item' or unset
    const includeMovements =
      !filters.entityType ||
      ['InventoryMovement', 'Item', 'Store'].includes(filters.entityType);

    const movementWhere = includeMovements
      ? {
          ...(filters.actedById ? { createdById: filters.actedById } : {}),
          ...(fromDate || toDate
            ? { createdAt: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } }
            : {}),
          ...(filters.entityId ? { id: filters.entityId } : {}),
        }
      : null;

    const movements = movementWhere
      ? await this.prisma.inventoryMovement.findMany({
          where: movementWhere,
          include: {
            createdBy: { select: { id: true, fullName: true, email: true } },
            item: { select: { name: true } },
            fromStore: { select: { name: true } },
            toStore: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    // ── 4. AssetHistory ───────────────────────────────────────────────────────
    const includeAssetHistory =
      !filters.entityType || ['Asset', 'AssetHistory'].includes(filters.entityType);

    const assetHistoryWhere = includeAssetHistory
      ? {
          ...(filters.actedById ? { actedById: filters.actedById } : {}),
          ...(fromDate || toDate
            ? { createdAt: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } }
            : {}),
          ...(filters.entityId ? { assetId: filters.entityId } : {}),
        }
      : null;

    const assetHistory = assetHistoryWhere
      ? await this.prisma.assetHistory.findMany({
          where: assetHistoryWhere,
          include: {
            actedBy: { select: { id: true, fullName: true, email: true } },
            asset: { select: { assetTag: true } },
          },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    // ── Merge + normalize ────────────────────────────────────────────────────
    const events: AuditEvent[] = [
      ...auditLogs.map((r) => ({
        id: `al-${r.id}`,
        source: 'AUDIT_LOG' as const,
        entityType: r.entityType,
        entityId: r.entityId,
        action: r.action,
        description: `${r.action} on ${r.entityType}`,
        actedBy: r.actedBy,
        createdAt: r.createdAt,
        before: r.before,
        after: r.after,
      })),
      ...approvals.map((r) => ({
        id: `ah-${r.id}`,
        source: 'APPROVAL_HISTORY' as const,
        entityType: r.workflowInstance.entityType,
        entityId: r.workflowInstance.entityId,
        action: r.action,
        description: `Step ${r.stepOrder} ${r.action.toLowerCase()}${r.comment ? `: ${r.comment}` : ''}`,
        actedBy: r.actedBy,
        createdAt: r.createdAt,
      })),
      ...movements.map((r) => ({
        id: `im-${r.id}`,
        source: 'INVENTORY_MOVEMENT' as const,
        entityType: 'InventoryMovement',
        entityId: r.id,
        action: r.movementType,
        description: `${r.movementType} — ${r.quantity}x ${r.item.name}${r.fromStore ? ` from ${r.fromStore.name}` : ''}${r.toStore ? ` to ${r.toStore.name}` : ''}`,
        actedBy: r.createdBy,
        createdAt: r.createdAt,
      })),
      ...assetHistory.map((r) => ({
        id: `ast-${r.id}`,
        source: 'ASSET_HISTORY' as const,
        entityType: 'Asset',
        entityId: r.assetId,
        action: r.eventType,
        description: `${r.eventType} — Asset ${r.asset.assetTag}`,
        actedBy: r.actedBy,
        createdAt: r.createdAt,
      })),
    ];

    // Sort newest first
    events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = events.length;
    const data = events.slice((page - 1) * limit, page * limit);

    return { data, total };
  }

  /** All audit events for a specific entity (all sources). */
  async findByEntity(entityType: string, entityId: string): Promise<AuditEvent[]> {
    const result = await this.findAll({ entityType, entityId, limit: 200 });
    return result.data;
  }
}
