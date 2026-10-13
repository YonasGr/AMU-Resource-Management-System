import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CycleCountStatus,
  MaterialReturnStatus,
  ReturnDisposition,
  Role,
  ScopeType,
  TransactionType,
  TransferStatus,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { AccessControlService } from '../auth/access-control.service';
import { StockConflictException } from './stock-conflict.exception';
import { SafeUser } from '../auth/decorators/current-user.decorator';
import {
  AdjustmentDto,
  CancelTransferDto,
  CreateCycleCountDto,
  CreateGoodsReceiptDto,
  CreateReturnInspectionDto,
  InspectGoodsReceiptDto,
  RejectGoodsReceiptDto,
  InspectReturnDto,
  ReturnDto,
  StockInDto,
  StockOutDto,
  SubmitCycleCountDto,
  TransferDto,
} from './dto/inventory.dto';

type InventoryActor = Pick<SafeUser, 'id' | 'storeId' | 'scopeType' | 'role'>;
const DIRECT_ADJUSTMENT_ADMIN_THRESHOLD = 10;

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly auditService: AuditService,
    private readonly accessControlService: AccessControlService,
  ) {}

  private validateTraceability(
    material: Partial<{
      requiresLotTracking: boolean;
      requiresExpiryTracking: boolean;
      requiresSerialTracking: boolean;
    }>,
    data: { lotNumber?: string; expiryDate?: string; serialNumber?: string },
    quantity: number,
  ) {
    if (material.requiresLotTracking === true && !data.lotNumber?.trim()) {
      throw new BadRequestException('A lot number is required for this material');
    }
    if (material.requiresExpiryTracking === true && !data.expiryDate) {
      throw new BadRequestException('An expiry date is required for this material');
    }
    if (data.expiryDate && new Date(data.expiryDate) <= new Date()) {
      throw new BadRequestException('Expiry date must be in the future');
    }
    if (material.requiresSerialTracking === true && (!data.serialNumber?.trim() || quantity !== 1)) {
      throw new BadRequestException('Serial-tracked material movements must provide one serial number per unit');
    }
  }

  private normalizeActor(actor: SafeUser | InventoryActor | string): InventoryActor {
    if (typeof actor === 'string') {
      return { id: actor, storeId: 'legacy-store', scopeType: ScopeType.STORE, role: Role.STOREKEEPER };
    }
    return actor;
  }

  private resolveStoreId(actor: SafeUser | InventoryActor | string, requestedStoreId?: string): string {
    const user = this.normalizeActor(actor);
    if (
      requestedStoreId &&
      user.scopeType === ScopeType.STORE &&
      user.storeId &&
      requestedStoreId !== user.storeId
    ) {
      throw new ForbiddenException('You cannot mutate inventory for another store');
    }

    const storeId = requestedStoreId || user.storeId;
    if (!storeId && (user.role === Role.ADMINISTRATOR || user.scopeType === ScopeType.GLOBAL)) {
      throw new BadRequestException('A storeId is required for global inventory operations');
    }
    if (!storeId) {
      throw new ForbiddenException('Your account is not assigned to an inventory store');
    }
    return storeId;
  }

  private async findExistingTransaction(
    tx: Prisma.TransactionClient,
    idempotencyKey: string | undefined,
    expected: { type: TransactionType; materialId: string; storeId: string },
  ) {
    if (!idempotencyKey) return null;
    const existing = await tx.inventoryTransaction.findUnique({ where: { idempotencyKey } });
    if (!existing) return null;
    if (
      existing.type !== expected.type ||
      existing.materialId !== expected.materialId ||
      existing.storeId !== expected.storeId
    ) {
      throw new BadRequestException('The idempotency key was already used for a different inventory operation');
    }
    return existing;
  }

  /** Emit a low-stock alert if stock has fallen below minimum */
  private async maybeAlertLowStock(materialId: string, storeId: string) {
    const material = await this.prisma.material.findUnique({
      where: { id: materialId },
      include: { stockBalances: { where: { storeId }, take: 1 }, stockSummary: true },
    });
    const balance = material?.stockBalances?.[0];
    if (!material || !balance) return;

    const { remainingQuantity } = balance;
    if (remainingQuantity < material.minimumStock) {
      const recipientIds = await Promise.all([
        this.notifications.getUserIdsByRole('STORE_MANAGER'),
        this.notifications.getUserIdsByRole('STOREKEEPER'),
      ]);
      const uniqueIds = [...new Set(recipientIds.flat())];
      await this.notifications.createForUsers(
        uniqueIds,
        'LOW_STOCK_ALERT',
        `⚠️ Low Stock: ${material.name}`,
        `"${material.name}" (${material.materialCode}) is low: ${remainingQuantity} ${material.unit}(s) remaining, minimum is ${material.minimumStock}.`,
        { materialId, materialCode: material.materialCode, remainingQuantity, minimumStock: material.minimumStock },
      );
    }
  }

  /** Stock In (Receive materials from supplier or internal source) */
  async stockIn(actor: SafeUser | string, dto: StockInDto) {
    const user = this.normalizeActor(actor);
    const storeId = this.resolveStoreId(user, dto.storeId);
    const material = await this.prisma.material.findUnique({
      where: { id: dto.materialId },
      include: { stockSummary: true },
    });
    if (!material) {
      throw new NotFoundException(`Material ${dto.materialId} not found`);
    }
    this.validateTraceability(material, dto, dto.quantity);
    const existing = await this.findExistingTransaction(this.prisma, dto.idempotencyKey, {
      type: TransactionType.STOCK_IN,
      materialId: dto.materialId,
      storeId,
    });
    if (existing) return existing;

    const timeStamp = Date.now().toString().slice(-6);
    const rand = Math.floor(100 + Math.random() * 900);
    const txnCode = `TXN-IN-${timeStamp}-${rand}`;

    const transaction = await this.prisma.$transaction(async (tx) => {
      const existing = await this.findExistingTransaction(tx, dto.idempotencyKey, {
        type: TransactionType.STOCK_IN,
        materialId: dto.materialId,
        storeId,
      });
      if (existing) return existing;

      const txn = await tx.inventoryTransaction.create({
        data: {
          transactionCode: txnCode,
          idempotencyKey: dto.idempotencyKey,
          type: TransactionType.STOCK_IN,
          materialId: dto.materialId,
          storeId,
          quantity: dto.quantity,
          unitPrice: dto.unitPrice,
          supplierId: dto.supplierId || null,
          lotNumber: dto.lotNumber,
          batchNumber: dto.batchNumber,
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
          serialNumber: dto.serialNumber,
          condition: dto.condition,
          issuedById: user.id,
          purpose: dto.purpose || 'Stock Received',
          remarks: dto.remarks,
        } as never,
        include: {
          material: true,
          supplier: true,
          issuedBy: { select: { fullName: true } },
        },
      });

      await tx.stockSummary.upsert({
        where: { materialId: dto.materialId },
        update: {
          quantityReceived: { increment: dto.quantity },
          remainingQuantity: { increment: dto.quantity },
        },
        create: {
          materialId: dto.materialId,
          quantityReceived: dto.quantity,
          quantityIssued: 0,
          remainingQuantity: dto.quantity,
        },
      });

      await tx.stockBalance.upsert({
        where: { storeId_materialId: { storeId, materialId: dto.materialId } },
        update: {
          quantityReceived: { increment: dto.quantity },
          remainingQuantity: { increment: dto.quantity },
        },
        create: {
          storeId,
          materialId: dto.materialId,
          quantityReceived: dto.quantity,
          remainingQuantity: dto.quantity,
        },
      });

      return txn;
    });

    // Notify managers & storekeepers about stock-in (outside tx, fire-and-forget)
    const recipientIds = await Promise.all([
      this.notifications.getUserIdsByRole('STORE_MANAGER'),
      this.notifications.getUserIdsByRole('STOREKEEPER'),
    ]);
    const uniqueIds = [...new Set(recipientIds.flat())];
    await this.notifications.createForUsers(
      uniqueIds,
      'STOCK_IN_RECORDED',
      `Stock In: ${material.name}`,
      `${dto.quantity} ${material.unit}(s) of "${material.name}" (${material.materialCode}) received into stock.`,
      { materialId: dto.materialId, materialCode: material.materialCode, quantity: dto.quantity },
    );

    // Audit Log
    await this.auditService.log(
      user.id,
      'STOCK_IN',
      'INVENTORY',
      `Received ${dto.quantity} ${material.unit}(s) of "${material.name}" (${material.materialCode}) [Txn: ${transaction.transactionCode}]`,
    );

    return transaction;
  }

  async createGoodsReceipt(actor: SafeUser | string, dto: CreateGoodsReceiptDto) {
    const user = this.normalizeActor(actor);
    this.resolveStoreId(user, dto.storeId);
    const [material, store] = await Promise.all([
      this.prisma.material.findUnique({ where: { id: dto.materialId } }),
      this.prisma.store.findFirst({ where: { id: dto.storeId, status: 'ACTIVE' } }),
    ]);
    if (!material) throw new NotFoundException(`Material ${dto.materialId} not found`);
    if (!store) throw new BadRequestException('The receiving store is not active');
    this.validateTraceability(material, dto, dto.quantityReceived);

    let purchaseOrderId: string | undefined;
    if (dto.purchaseOrderLineId) {
      const line = await this.prisma.purchaseOrderLine.findUnique({
        where: { id: dto.purchaseOrderLineId },
        include: { purchaseOrder: true },
      });
      if (!line) throw new NotFoundException(`Purchase order line ${dto.purchaseOrderLineId} not found`);
      if (!['APPROVED', 'PARTIALLY_RECEIVED'].includes(line.purchaseOrder.status)) {
        throw new BadRequestException('Goods can only be received against an approved purchase order');
      }
      if (line.purchaseOrder.storeId !== dto.storeId || line.materialId !== dto.materialId) {
        throw new BadRequestException('The receipt does not match the purchase order line destination or material');
      }
      if (dto.supplierId && dto.supplierId !== line.purchaseOrder.supplierId) {
        throw new BadRequestException('The receipt supplier does not match the purchase order supplier');
      }
      if (line.quantityReceived + dto.quantityReceived > line.quantityOrdered) {
        throw new BadRequestException('Received quantity cannot exceed the ordered quantity');
      }
      purchaseOrderId = line.purchaseOrderId;
    }
    const receiptCode = `GRN-${Date.now().toString().slice(-8)}-${Math.floor(100 + Math.random() * 900)}`;
    const receipt = await this.prisma.goodsReceipt.create({
      data: {
        receiptCode,
        materialId: dto.materialId,
        storeId: dto.storeId,
        supplierId: dto.supplierId,
        purchaseOrderId,
        purchaseOrderLineId: dto.purchaseOrderLineId,
        quantityReceived: dto.quantityReceived,
        deliveryReference: dto.deliveryReference,
        condition: dto.condition,
        lotNumber: dto.lotNumber,
        batchNumber: dto.batchNumber,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        serialNumber: dto.serialNumber,
        remarks: dto.remarks,
        createdById: user.id,
      } as never,
      include: { material: true, store: true, supplier: true },
    });
    await this.auditService.log(user.id, 'CREATE_GOODS_RECEIPT', 'INVENTORY', `Created goods receipt ${receiptCode}`);
    return receipt;
  }

  async inspectGoodsReceipt(id: string, actor: SafeUser | string, dto: InspectGoodsReceiptDto) {
    const user = this.normalizeActor(actor);
    const receipt = await this.prisma.goodsReceipt.findUnique({ where: { id }, include: { purchaseOrderLine: true } });
    if (!receipt) throw new NotFoundException(`Goods receipt ${id} not found`);
    this.resolveStoreId(user, receipt.storeId);
    if (receipt.createdById === user.id) {
      throw new ForbiddenException('The person who created a goods receipt cannot inspect it');
    }
    if (receipt.status !== 'DRAFT') {
      throw new BadRequestException(`Only DRAFT receipts can be inspected. Current status is ${receipt.status}`);
    }
    if (dto.quantityAccepted + dto.quantityRejected !== receipt.quantityReceived) {
      throw new BadRequestException('Accepted and rejected quantities must equal the received quantity');
    }
    if (dto.quantityRejected > 0 && !dto.condition?.trim()) {
      throw new BadRequestException('A condition note is required when quantities are rejected');
    }
    const inspected = await this.prisma.goodsReceipt.update({
      where: { id },
      data: {
        status: 'INSPECTED',
        quantityAccepted: dto.quantityAccepted,
        quantityRejected: dto.quantityRejected,
        condition: dto.condition ?? receipt.condition,
        remarks: dto.remarks ?? receipt.remarks,
        inspectedById: user.id,
        inspectedAt: new Date(),
      } as never,
      include: { material: true, store: true, supplier: true },
    });
    await this.auditService.log(user.id, 'INSPECT_GOODS_RECEIPT', 'INVENTORY', `Inspected goods receipt ${receipt.receiptCode}`);
    return inspected;
  }

  async postGoodsReceipt(id: string, actor: SafeUser | string) {
    const user = this.normalizeActor(actor);
    const receipt = await this.prisma.goodsReceipt.findUnique({ where: { id } });
    if (!receipt) throw new NotFoundException(`Goods receipt ${id} not found`);
    this.resolveStoreId(user, receipt.storeId);
    if (receipt.createdById === user.id || receipt.inspectedById === user.id) {
      throw new ForbiddenException('Goods receipt posting requires an independent operator');
    }
    if (receipt.status !== 'INSPECTED') {
      throw new BadRequestException(`Only INSPECTED receipts can be posted. Current status is ${receipt.status}`);
    }
    const transactionCode = `TXN-IN-${receipt.receiptCode}`;
    const posted = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.goodsReceipt.updateMany({
        where: { id, status: 'INSPECTED' },
        data: { status: 'POSTED', postedById: user.id, postedAt: new Date() },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException('This goods receipt has already been posted or is no longer inspectable');
      }
      await tx.stockBalance.upsert({
        where: { storeId_materialId: { storeId: receipt.storeId, materialId: receipt.materialId } },
        update: {
          quantityReceived: { increment: receipt.quantityAccepted },
          remainingQuantity: { increment: receipt.quantityAccepted },
        },
        create: {
          storeId: receipt.storeId,
          materialId: receipt.materialId,
          quantityReceived: receipt.quantityAccepted,
          remainingQuantity: receipt.quantityAccepted,
        },
      });
      await tx.stockSummary.upsert({
        where: { materialId: receipt.materialId },
        update: {
          quantityReceived: { increment: receipt.quantityAccepted },
          remainingQuantity: { increment: receipt.quantityAccepted },
        },
        create: {
          materialId: receipt.materialId,
          quantityReceived: receipt.quantityAccepted,
          remainingQuantity: receipt.quantityAccepted,
        },
      });
      await tx.inventoryTransaction.create({
        data: {
          transactionCode,
          type: TransactionType.STOCK_IN,
          materialId: receipt.materialId,
          storeId: receipt.storeId,
          supplierId: receipt.supplierId,
          lotNumber: receipt.lotNumber,
          batchNumber: receipt.batchNumber,
          expiryDate: receipt.expiryDate,
          serialNumber: receipt.serialNumber,
          quantity: receipt.quantityAccepted,
          issuedById: user.id,
          purpose: `Goods receipt ${receipt.receiptCode}`,
          remarks: receipt.remarks,
        } as never,
      });
      if (receipt.purchaseOrderLineId) {
        const currentLine = await tx.purchaseOrderLine.findUnique({ where: { id: receipt.purchaseOrderLineId } });
        if (!currentLine || currentLine.quantityReceived + receipt.quantityAccepted > currentLine.quantityOrdered) {
          throw new BadRequestException('Posting this receipt would exceed the purchase order quantity');
        }
        const line = await tx.purchaseOrderLine.update({
          where: { id: receipt.purchaseOrderLineId },
          data: { quantityReceived: { increment: receipt.quantityAccepted } },
        });
        const remaining = line.quantityOrdered - line.quantityReceived;
        await tx.purchaseOrder.update({
          where: { id: line.purchaseOrderId },
          data: { status: remaining === 0 ? 'RECEIVED' : 'PARTIALLY_RECEIVED' },
        });
      }
      const postedReceipt = await tx.goodsReceipt.update({
        where: { id },
        data: {},
        include: { material: true, store: true, supplier: true },
      });
      await this.auditService.logInTransaction(
        tx,
        user.id,
        'POST_GOODS_RECEIPT',
        'INVENTORY',
        `Posted goods receipt ${receipt.receiptCode}`,
        {
          actorRole: user.role,
          storeId: receipt.storeId,
          entityType: 'GOODS_RECEIPT',
          entityId: receipt.id,
          beforeData: { status: receipt.status },
          afterData: {
            status: 'POSTED',
            quantityAccepted: receipt.quantityAccepted,
            transactionCode,
          },
        },
      );
      return postedReceipt;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return posted;
  }

  async rejectGoodsReceipt(id: string, actor: SafeUser | string, dto: RejectGoodsReceiptDto) {
    const user = this.normalizeActor(actor);
    if (!dto.remarks?.trim()) {
      throw new BadRequestException('Goods receipt rejection remarks are required');
    }

    const receipt = await this.prisma.goodsReceipt.findUnique({ where: { id } });
    if (!receipt) throw new NotFoundException(`Goods receipt ${id} not found`);
    this.resolveStoreId(user, receipt.storeId);
    if (receipt.createdById === user.id) {
      throw new ForbiddenException('The person who created a goods receipt cannot reject it');
    }
    if (receipt.status !== 'DRAFT') {
      throw new BadRequestException(`Only DRAFT receipts can be rejected. Current status is ${receipt.status}`);
    }

    const rejected = await this.prisma.goodsReceipt.updateMany({
      where: { id, status: 'DRAFT' },
      data: {
        status: 'REJECTED',
        inspectedById: user.id,
        inspectedAt: new Date(),
        rejectionReasonCode: dto.reasonCode,
        remarks: dto.remarks.trim(),
      } as never,
    });
    if (rejected.count !== 1) {
      throw new StockConflictException('Goods receipt changed before rejection; refresh and retry', {
        operation: 'REJECT_GOODS_RECEIPT',
        materialId: receipt.materialId,
        storeId: receipt.storeId,
      });
    }

    const result = await this.prisma.goodsReceipt.findUnique({
      where: { id },
      include: { material: true, store: true, supplier: true },
    });
    await this.auditService.log(
      user.id,
      'REJECT_GOODS_RECEIPT',
      'INVENTORY',
      `Rejected goods receipt ${receipt.receiptCode}`,
      {
        actorRole: user.role,
        entityType: 'GOODS_RECEIPT',
        entityId: id,
        reason: dto.remarks.trim(),
        beforeData: { status: receipt.status },
        afterData: { status: 'REJECTED', reasonCode: dto.reasonCode },
      },
    );
    return result;
  }

  async createCycleCount(actor: SafeUser | string, dto: CreateCycleCountDto) {
    const user = this.normalizeActor(actor);
    const storeId = this.resolveStoreId(user, dto.storeId);
    const materialIds = dto.lines.map((line) => line.materialId);
    if (new Set(materialIds).size !== materialIds.length) {
      throw new BadRequestException('A cycle count cannot contain the same material more than once');
    }
    const [store, materials] = await Promise.all([
      this.prisma.store.findFirst({ where: { id: storeId, status: 'ACTIVE' } }),
      this.prisma.material.findMany({
        where: { id: { in: materialIds }, status: 'ACTIVE' },
        include: { stockBalances: { where: { storeId }, select: { remainingQuantity: true } } },
      }),
    ]);
    if (!store) throw new BadRequestException('The counting store is not active');
    if (materials.length !== materialIds.length) {
      throw new NotFoundException('One or more cycle count materials were not found or are inactive');
    }

    const countCode = `CC-${Date.now().toString().slice(-8)}-${Math.floor(100 + Math.random() * 900)}`;
    const count = await this.prisma.cycleCount.create({
      data: {
        countCode,
        storeId,
        createdById: user.id,
        remarks: dto.remarks,
        lines: {
          create: materials.map((material) => ({
            materialId: material.id,
            systemQuantity: material.stockBalances[0]?.remainingQuantity ?? 0,
          })),
        },
      },
      include: { lines: { include: { material: true } }, store: true },
    });
    await this.auditService.log(user.id, 'CREATE_CYCLE_COUNT', 'INVENTORY', `Created cycle count ${countCode}`);
    return count;
  }

  async requestCycleCountRecount(id: string, actor: SafeUser | string) {
    const user = this.normalizeActor(actor);
    const count = await this.prisma.cycleCount.findUnique({ where: { id } });
    if (!count) throw new NotFoundException(`Cycle count ${id} not found`);
    this.resolveStoreId(user, count.storeId);
    if (count.createdById === user.id) {
      throw new ForbiddenException('The person who created a cycle count cannot approve its variance');
    }
    if (count.status !== CycleCountStatus.COUNTED) {
      throw new BadRequestException(`Only COUNTED cycle counts can be sent for recount. Current status is ${count.status}`);
    }
    const result = await this.prisma.cycleCount.update({
      where: { id },
      data: { status: CycleCountStatus.RECOUNT_REQUIRED },
      include: { lines: { include: { material: true } }, store: true },
    });
    await this.auditService.log(user.id, 'REQUEST_CYCLE_COUNT_RECOUNT', 'INVENTORY', `Requested recount for ${count.countCode}`);
    return result;
  }

  async submitCycleCount(id: string, actor: SafeUser | string, dto: SubmitCycleCountDto) {
    const user = this.normalizeActor(actor);
    const count = await this.prisma.cycleCount.findUnique({ where: { id }, include: { lines: true } });
    if (!count) throw new NotFoundException(`Cycle count ${id} not found`);
    this.resolveStoreId(user, count.storeId);
    if (count.status !== CycleCountStatus.DRAFT && count.status !== CycleCountStatus.RECOUNT_REQUIRED) {
      throw new BadRequestException(`Only DRAFT or RECOUNT_REQUIRED cycle counts can be submitted. Current status is ${count.status}`);
    }
    const submittedIds = dto.lines.map((line) => line.lineId);
    if (
      new Set(submittedIds).size !== submittedIds.length ||
      submittedIds.length !== count.lines.length ||
      count.lines.some((line) => !submittedIds.includes(line.id))
    ) {
      throw new BadRequestException('Every cycle count line must be submitted exactly once');
    }
    const updates = dto.lines.map((submitted) => {
      const line = count.lines.find((candidate) => candidate.id === submitted.lineId)!;
      const variance = submitted.physicalQuantity - line.systemQuantity;
      if (variance !== 0 && !submitted.varianceReason?.trim()) {
        throw new BadRequestException(`A variance reason is required for ${line.materialId}`);
      }
      return { line, submitted, variance };
    });
    const result = await this.prisma.$transaction(async (tx) => {
      for (const { line, submitted, variance } of updates) {
        await tx.cycleCountLine.update({
          where: { id: line.id },
          data: {
            physicalQuantity: submitted.physicalQuantity,
            variance,
            varianceReason: submitted.varianceReason?.trim() || null,
          },
        });
      }
      return tx.cycleCount.update({
        where: { id },
        data: { status: CycleCountStatus.COUNTED },
        include: { lines: { include: { material: true } }, store: true },
      });
    });
    await this.auditService.log(user.id, 'SUBMIT_CYCLE_COUNT', 'INVENTORY', `Submitted cycle count ${count.countCode}`);
    return result;
  }

  async approveCycleCount(id: string, actor: SafeUser | string) {
    const user = this.normalizeActor(actor);
    const count = await this.prisma.cycleCount.findUnique({ where: { id }, include: { lines: true } });
    if (!count) throw new NotFoundException(`Cycle count ${id} not found`);
    this.resolveStoreId(user, count.storeId);
    if (count.createdById === user.id) {
      throw new ForbiddenException('The person who created a cycle count cannot approve its variance');
    }
    if (count.status !== CycleCountStatus.COUNTED) {
      throw new BadRequestException(`Only COUNTED cycle counts can be approved. Current status is ${count.status}`);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.cycleCount.updateMany({
        where: { id, status: CycleCountStatus.COUNTED },
        data: { status: CycleCountStatus.APPROVED, approvedById: user.id, approvedAt: new Date() },
      });
      if (claimed.count !== 1) throw new BadRequestException('This cycle count has already been processed');

      for (const line of count.lines) {
        if (line.physicalQuantity === null || line.variance === 0) continue;
        const balance = await tx.stockBalance.findUnique({
          where: { storeId_materialId: { storeId: count.storeId, materialId: line.materialId } },
        });
        if (balance) {
          const changed = await tx.stockBalance.updateMany({
            where: { id: balance.id, remainingQuantity: line.systemQuantity },
            data: { remainingQuantity: line.physicalQuantity },
          });
          if (changed.count !== 1) {
            throw new BadRequestException(`Stock changed for material ${line.materialId}; recount is required`);
          }
        } else if (line.systemQuantity === 0) {
          await tx.stockBalance.create({
            data: {
              storeId: count.storeId,
              materialId: line.materialId,
              quantityReceived: line.physicalQuantity,
              remainingQuantity: line.physicalQuantity,
            },
          });
        } else {
          throw new BadRequestException(`Stock balance missing for material ${line.materialId}; recount is required`);
        }
        const summary = await tx.stockSummary.updateMany({
          where: { materialId: line.materialId },
          data: { remainingQuantity: { increment: line.variance } },
        });
        if (summary.count !== 1) throw new BadRequestException(`Stock summary missing for material ${line.materialId}`);
        await tx.inventoryTransaction.create({
          data: {
            transactionCode: `CNT-${count.countCode}-${line.id}`,
            type: TransactionType.ADJUSTMENT,
            materialId: line.materialId,
            storeId: count.storeId,
            quantity: Math.abs(line.variance),
            issuedById: user.id,
            purpose: 'Cycle Count Variance',
            remarks: `Adjusted from ${line.systemQuantity} to ${line.physicalQuantity}. Reason: ${line.varianceReason}`,
          },
        });
      }
      await this.auditService.logInTransaction(
        tx,
        user.id,
        'APPROVE_CYCLE_COUNT',
        'INVENTORY',
        `Approved cycle count ${count.countCode}`,
        {
          actorRole: user.role,
          storeId: count.storeId,
          entityType: 'CYCLE_COUNT',
          entityId: count.id,
          beforeData: {
            status: CycleCountStatus.COUNTED,
            lines: count.lines.map((line) => ({
              lineId: line.id,
              systemQuantity: line.systemQuantity,
              physicalQuantity: line.physicalQuantity,
              variance: line.variance,
            })),
          },
          afterData: {
            status: CycleCountStatus.APPROVED,
            approvedById: user.id,
          },
        },
      );
      return tx.cycleCount.findUnique({
        where: { id },
        include: { lines: { include: { material: true } }, store: true },
      });
    });
    return result;
  }

  async createReturnInspection(actor: SafeUser | string, dto: CreateReturnInspectionDto) {
    const user = this.normalizeActor(actor);
    const requestItem = await this.prisma.materialRequestItem.findUnique({
      where: { id: dto.requestItemId },
      include: {
        request: { select: { id: true, requestNumber: true, status: true, storeId: true } },
        material: true,
      },
    });
    if (!requestItem || requestItem.requestId !== dto.requestId) {
      throw new NotFoundException('Issued request item was not found');
    }
    if (requestItem.request.status !== 'ISSUED') {
      throw new BadRequestException('Materials can only be returned against an issued request');
    }
    const storeId = this.resolveStoreId(user, requestItem.request.storeId ?? dto.storeId);
    this.validateTraceability(requestItem.material, dto, dto.quantity);
    const pendingReturns = await this.prisma.materialReturn.findMany({
      where: { requestItemId: dto.requestItemId, status: { in: [MaterialReturnStatus.DRAFT, MaterialReturnStatus.INSPECTED] } },
      select: { quantity: true },
    });
    const pendingQuantity = pendingReturns.reduce((sum, current) => sum + current.quantity, 0);
    const outstanding = requestItem.quantityIssued - requestItem.quantityReturned - pendingQuantity;
    if (dto.quantity > outstanding) {
      throw new BadRequestException(`Only ${Math.max(0, outstanding)} item(s) remain eligible for inspection`);
    }

    const returnCode = `RET-${Date.now().toString().slice(-8)}-${Math.floor(100 + Math.random() * 900)}`;
    const result = await this.prisma.materialReturn.create({
      data: {
        returnCode,
        requestId: dto.requestId,
        requestItemId: dto.requestItemId,
        materialId: requestItem.materialId,
        storeId,
        quantity: dto.quantity,
        condition: dto.condition,
        lotNumber: dto.lotNumber,
        batchNumber: dto.batchNumber,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        serialNumber: dto.serialNumber,
        remarks: dto.remarks,
        createdById: user.id,
      },
      include: { material: true, store: true, request: true, requestItem: true },
    });
    await this.auditService.log(user.id, 'CREATE_RETURN_INSPECTION', 'INVENTORY', `Created return inspection ${returnCode}`);
    return result;
  }

  async inspectReturn(id: string, actor: SafeUser | string, dto: InspectReturnDto) {
    const user = this.normalizeActor(actor);
    const returnRecord = await this.prisma.materialReturn.findUnique({
      where: { id },
      include: { requestItem: { select: { quantityIssued: true, quantityReturned: true } } },
    });
    if (!returnRecord) throw new NotFoundException(`Return inspection ${id} not found`);
    this.resolveStoreId(user, returnRecord.storeId);
    if (returnRecord.createdById === user.id) {
      throw new ForbiddenException('The person who created a return inspection cannot inspect it');
    }
    if (returnRecord.status !== MaterialReturnStatus.DRAFT) {
      throw new BadRequestException(`Only DRAFT returns can be inspected. Current status is ${returnRecord.status}`);
    }
    const inspected = await this.prisma.materialReturn.update({
      where: { id },
      data: {
        status: MaterialReturnStatus.INSPECTED,
        disposition: dto.disposition as ReturnDisposition,
        condition: dto.condition ?? returnRecord.condition,
        remarks: dto.remarks ?? returnRecord.remarks,
        inspectedById: user.id,
        inspectedAt: new Date(),
      },
      include: { material: true, store: true, request: true, requestItem: true },
    });
    await this.auditService.log(user.id, 'INSPECT_RETURN', 'INVENTORY', `Inspected return ${returnRecord.returnCode} as ${dto.disposition}`);
    return inspected;
  }

  async postReturnInspection(id: string, actor: SafeUser | string) {
    const user = this.normalizeActor(actor);
    const returnRecord = await this.prisma.materialReturn.findUnique({
      where: { id },
      include: { requestItem: { select: { quantityIssued: true, quantityReturned: true } } },
    });
    if (!returnRecord) throw new NotFoundException(`Return inspection ${id} not found`);
    this.resolveStoreId(user, returnRecord.storeId);
    if (returnRecord.createdById === user.id || returnRecord.inspectedById === user.id) {
      throw new ForbiddenException('Return posting requires an independent operator');
    }
    if (returnRecord.status !== MaterialReturnStatus.INSPECTED || !returnRecord.disposition) {
      throw new BadRequestException(`Only inspected returns with a disposition can be posted. Current status is ${returnRecord.status}`);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.materialReturn.updateMany({
        where: { id, status: MaterialReturnStatus.INSPECTED },
        data: { status: MaterialReturnStatus.POSTED, postedById: user.id, postedAt: new Date() },
      });
      if (claimed.count !== 1) throw new BadRequestException('This return has already been posted or is no longer inspectable');

      const updatedItem = await tx.materialRequestItem.updateMany({
        where: {
          id: returnRecord.requestItemId,
          requestId: returnRecord.requestId,
          quantityReturned: { lte: returnRecord.requestItem.quantityIssued - returnRecord.requestItem.quantityReturned - returnRecord.quantity },
        },
        data: { quantityReturned: { increment: returnRecord.quantity } },
      });
      if (updatedItem.count !== 1) {
        throw new BadRequestException('Return exceeds the remaining quantity for this request item');
      }

      if (returnRecord.disposition === ReturnDisposition.ACCEPT_TO_STOCK) {
        await tx.stockBalance.upsert({
          where: { storeId_materialId: { storeId: returnRecord.storeId, materialId: returnRecord.materialId } },
          update: {
            quantityIssued: { decrement: returnRecord.quantity },
            remainingQuantity: { increment: returnRecord.quantity },
          },
          create: {
            storeId: returnRecord.storeId,
            materialId: returnRecord.materialId,
            quantityReceived: returnRecord.quantity,
            remainingQuantity: returnRecord.quantity,
          },
        });
        await tx.stockSummary.update({
          where: { materialId: returnRecord.materialId },
          data: {
            quantityIssued: { decrement: returnRecord.quantity },
            remainingQuantity: { increment: returnRecord.quantity },
          },
        });
        await tx.inventoryTransaction.create({
          data: {
            transactionCode: `${returnRecord.returnCode}-IN`,
            type: TransactionType.RETURN,
            materialId: returnRecord.materialId,
            storeId: returnRecord.storeId,
            requestId: returnRecord.requestId,
            requestItemId: returnRecord.requestItemId,
            quantity: returnRecord.quantity,
            issuedById: user.id,
            purpose: 'Inspected material return',
            remarks: `Accepted return ${returnRecord.returnCode} into stock`,
          },
        });
      }

      return tx.materialReturn.update({
        where: { id },
        data: {},
        include: { material: true, store: true, request: true, requestItem: true },
      });
    });
    await this.auditService.log(user.id, 'POST_RETURN_INSPECTION', 'INVENTORY', `Posted return ${returnRecord.returnCode} as ${returnRecord.disposition}`);
    return result;
  }

  /** Direct Stock Out (Issue materials directly to employee / department) */
  async stockOut(actor: SafeUser | string, dto: StockOutDto) {
    const user = this.normalizeActor(actor);
    const storeId = this.resolveStoreId(user, dto.storeId);
    const material = await this.prisma.material.findUnique({
      where: { id: dto.materialId },
      include: { stockSummary: true },
    });
    if (!material) {
      throw new NotFoundException(`Material ${dto.materialId} not found`);
    }
    const existing = await this.findExistingTransaction(this.prisma, dto.idempotencyKey, {
      type: TransactionType.STOCK_OUT,
      materialId: dto.materialId,
      storeId,
    });
    if (existing) return existing;

    const timeStamp = Date.now().toString().slice(-6);
    const rand = Math.floor(100 + Math.random() * 900);
    const txnCode = `TXN-OUT-${timeStamp}-${rand}`;

    const transaction = await this.prisma.$transaction(async (tx) => {
      const existing = await this.findExistingTransaction(tx, dto.idempotencyKey, {
        type: TransactionType.STOCK_OUT,
        materialId: dto.materialId,
        storeId,
      });
      if (existing) return existing;

      const balance = await tx.stockBalance.findUnique({
        where: { storeId_materialId: { storeId, materialId: dto.materialId } },
      });
      const available = (balance?.remainingQuantity ?? 0) - (balance?.reservedQuantity ?? 0);
      if (!balance || available < dto.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${material.name}". Requested: ${dto.quantity}, Available: ${Math.max(0, available)}`,
        );
      }

      const decremented = await tx.stockBalance.updateMany({
        where: {
          id: balance.id,
          remainingQuantity: { gte: dto.quantity },
          reservedQuantity: balance.reservedQuantity,
        },
        data: {
          quantityIssued: { increment: dto.quantity },
          remainingQuantity: { decrement: dto.quantity },
        },
      });
      if (decremented.count !== 1) {
        throw new StockConflictException(
          `Stock changed while issuing "${material.name}". Refresh and try again.`,
          { operation: 'STOCK_OUT', materialId: dto.materialId, storeId },
        );
      }
      const summaryUpdated = await tx.stockSummary.updateMany({
        where: {
          materialId: dto.materialId,
          remainingQuantity: { gte: dto.quantity },
        },
        data: {
          quantityIssued: { increment: dto.quantity },
          remainingQuantity: { decrement: dto.quantity },
        },
      });
      if (summaryUpdated.count !== 1) {
        throw new StockConflictException(
          `Aggregate stock changed while issuing "${material.name}". Refresh and try again.`,
          { operation: 'STOCK_OUT', materialId: dto.materialId, storeId },
        );
      }

      const txn = await tx.inventoryTransaction.create({
        data: {
          transactionCode: txnCode,
          idempotencyKey: dto.idempotencyKey,
          type: TransactionType.STOCK_OUT,
          materialId: dto.materialId,
          storeId,
          quantity: dto.quantity,
          employeeId: dto.employeeId || null,
          departmentId: dto.departmentId || null,
          issuedById: user.id,
          purpose: dto.purpose || 'Direct Material Issue',
          remarks: dto.remarks,
        },
        include: {
          material: true,
          employee: true,
          department: true,
          issuedBy: { select: { fullName: true } },
        },
      });

      await this.auditService.logInTransaction(
        tx,
        user.id,
        'STOCK_OUT',
        'INVENTORY',
        `Issued ${dto.quantity} ${material.unit}(s) of "${material.name}" (${material.materialCode}) [Txn: ${txn.transactionCode}]`,
        {
          actorRole: user.role,
          storeId,
          entityType: 'INVENTORY_TRANSACTION',
          entityId: txn.id,
          reason: dto.remarks,
          beforeData: { availableQuantity: available },
          afterData: { availableQuantity: available - dto.quantity, quantityIssued: dto.quantity },
        },
      );

      return txn;
    });

    // Check if stock fell below minimum after this operation
    await this.maybeAlertLowStock(dto.materialId, storeId);

    return transaction;
  }

  /** Material Return (Record returned materials back into inventory) */
  async returnMaterial(actor: SafeUser | string, dto: ReturnDto) {
    const user = this.normalizeActor(actor);
    if (!Number.isInteger(dto.quantity) || dto.quantity < 1) {
      throw new BadRequestException('Return quantity must be a positive whole number');
    }

    const requestItem = await this.prisma.materialRequestItem.findUnique({
      where: { id: dto.requestItemId },
      include: {
        request: { select: { id: true, requestNumber: true, status: true, departmentId: true, storeId: true } },
        material: { include: { stockSummary: true } },
      },
    });
    if (!requestItem || requestItem.requestId !== dto.requestId) {
      throw new NotFoundException('Issued request item was not found');
    }
    if (requestItem.request.status !== 'ISSUED') {
      throw new BadRequestException('Materials can only be returned against an issued request');
    }
    if (requestItem.materialId !== dto.materialId) {
      throw new BadRequestException('Selected material does not match the issued request item');
    }
    const outstanding = requestItem.quantityIssued - requestItem.quantityReturned;
    if (dto.quantity > outstanding) {
      throw new BadRequestException(`Only ${outstanding} item(s) remain eligible for return on this request`);
    }
    const requestStoreId = requestItem.request.storeId;
    if (!requestStoreId) {
      throw new BadRequestException('The issued request is not assigned to a store');
    }

    const material = requestItem.material;
    const existing = await this.findExistingTransaction(this.prisma, dto.idempotencyKey, {
      type: TransactionType.RETURN,
      materialId: dto.materialId,
      storeId: requestStoreId,
    });
    if (existing) return existing;

    const timeStamp = Date.now().toString().slice(-6);
    const rand = Math.floor(100 + Math.random() * 900);
    const txnCode = `TXN-RET-${timeStamp}-${rand}`;

    const transaction = await this.prisma.$transaction(async (tx) => {
      const existing = await this.findExistingTransaction(tx, dto.idempotencyKey, {
        type: TransactionType.RETURN,
        materialId: dto.materialId,
        storeId: requestStoreId,
      });
      if (existing) return existing;

      // Conditional update makes the issued quantity cap safe if two returns race.
      const updatedItem = await tx.materialRequestItem.updateMany({
        where: {
          id: dto.requestItemId,
          requestId: dto.requestId,
          materialId: dto.materialId,
          quantityReturned: { lte: requestItem.quantityIssued - dto.quantity },
        },
        data: { quantityReturned: { increment: dto.quantity } },
      });
      if (updatedItem.count !== 1) {
        throw new BadRequestException('Return exceeds the remaining quantity for this request item');
      }

      const txn = await tx.inventoryTransaction.create({
        data: {
          transactionCode: txnCode,
          idempotencyKey: dto.idempotencyKey,
          type: TransactionType.RETURN,
          materialId: dto.materialId,
          storeId: requestItem.request.storeId,
          requestId: dto.requestId,
          requestItemId: dto.requestItemId,
          quantity: dto.quantity,
          employeeId: dto.employeeId || null,
          departmentId: dto.departmentId || requestItem.request.departmentId,
          issuedById: user.id,
          purpose: `Material Return for ${requestItem.request.requestNumber}`,
          remarks: dto.remarks || 'Returned to store against the original request',
        },
        include: {
          material: true,
          employee: true,
          department: true,
          request: { select: { id: true, requestNumber: true } },
          requestItem: { select: { id: true, quantityIssued: true, quantityReturned: true } },
          issuedBy: { select: { fullName: true } },
        },
      });

      await tx.stockBalance.update({
        where: {
          storeId_materialId: {
            storeId: requestStoreId,
            materialId: dto.materialId,
          },
        },
        data: {
          quantityIssued: { decrement: dto.quantity },
          remainingQuantity: { increment: dto.quantity },
        },
      });

      await tx.stockSummary.update({
        where: { materialId: dto.materialId },
        data: {
          quantityIssued: { decrement: dto.quantity },
          remainingQuantity: { increment: dto.quantity },
        },
      });

      await this.auditService.logInTransaction(
        tx,
        user.id,
        'RETURN',
        'INVENTORY',
        `Accepted return of ${dto.quantity} ${material.unit}(s) of "${material.name}" (${material.materialCode}) for request ${requestItem.request.requestNumber} [Txn: ${txn.transactionCode}]`,
        {
          actorRole: user.role,
          storeId: requestStoreId,
          entityType: 'INVENTORY_TRANSACTION',
          entityId: txn.id,
          reason: dto.remarks,
          beforeData: { quantityReturned: requestItem.quantityReturned },
          afterData: {
            quantityReturned: requestItem.quantityReturned + dto.quantity,
            quantityAcceptedToStock: dto.quantity,
          },
        },
      );

      return txn;
    });

    return transaction;
  }

  /** Stock Adjustment (Manual stock audit count adjustment) */
  async adjustStock(actor: SafeUser | string, dto: AdjustmentDto) {
    const user = this.normalizeActor(actor);
    if (user.role !== Role.STORE_MANAGER && user.role !== Role.ADMINISTRATOR) {
      throw new ForbiddenException('Direct stock adjustments require store manager approval');
    }
    const storeId = this.resolveStoreId(user, dto.storeId);
    const material = await this.prisma.material.findUnique({
      where: { id: dto.materialId },
      include: { stockSummary: true },
    });
    if (!material) {
      throw new NotFoundException(`Material ${dto.materialId} not found`);
    }
    const existing = await this.findExistingTransaction(this.prisma, dto.idempotencyKey, {
      type: TransactionType.ADJUSTMENT,
      materialId: dto.materialId,
      storeId,
    });
    if (existing) return existing;

    const storeBalance = await this.prisma.stockBalance.findUnique({
      where: { storeId_materialId: { storeId, materialId: dto.materialId } },
    });
    const currentRemaining = storeBalance?.remainingQuantity ?? 0;
    const diff = dto.newQuantity - currentRemaining;
    if (
      user.role === Role.STORE_MANAGER &&
      Math.abs(diff) > DIRECT_ADJUSTMENT_ADMIN_THRESHOLD
    ) {
      throw new ForbiddenException(
        `Adjustments greater than ${DIRECT_ADJUSTMENT_ADMIN_THRESHOLD} units require administrator approval`,
      );
    }
    if (
      user.role === Role.ADMINISTRATOR &&
      Math.abs(diff) > DIRECT_ADJUSTMENT_ADMIN_THRESHOLD &&
      dto.breakGlass !== true
    ) {
      throw new ForbiddenException(
        'Large administrator adjustments require explicit break-glass authorization',
      );
    }

    const timeStamp = Date.now().toString().slice(-6);
    const rand = Math.floor(100 + Math.random() * 900);
    const txnCode = `TXN-ADJ-${timeStamp}-${rand}`;

    const transaction = await this.prisma.$transaction(async (tx) => {
      const existing = await this.findExistingTransaction(tx, dto.idempotencyKey, {
        type: TransactionType.ADJUSTMENT,
        materialId: dto.materialId,
        storeId,
      });
      if (existing) return existing;

      const txn = await tx.inventoryTransaction.create({
        data: {
          transactionCode: txnCode,
          idempotencyKey: dto.idempotencyKey,
          type: TransactionType.ADJUSTMENT,
          materialId: dto.materialId,
          storeId,
          quantity: Math.abs(diff),
          issuedById: user.id,
          purpose: 'Stock Audit Adjustment',
          remarks: `Adjusted from ${currentRemaining} to ${dto.newQuantity}. Reason code: ${dto.reasonCode}. Operator remarks: ${dto.remarks}`,
        },
        include: {
          material: true,
          issuedBy: { select: { fullName: true } },
        },
      });

      await tx.stockBalance.upsert({
        where: { storeId_materialId: { storeId, materialId: dto.materialId } },
        update: { remainingQuantity: dto.newQuantity },
        create: {
          storeId,
          materialId: dto.materialId,
          remainingQuantity: dto.newQuantity,
        },
      });

      await tx.stockSummary.update({
        where: { materialId: dto.materialId },
        data: {
          remainingQuantity: { increment: diff },
        },
      });

      await this.auditService.logInTransaction(
        tx,
        user.id,
        'STOCK_ADJUSTMENT',
        'INVENTORY',
        `Stock audit adjusted "${material.name}" (${material.materialCode}) from ${currentRemaining} to ${dto.newQuantity} (Delta: ${diff >= 0 ? '+' : ''}${diff}). Reason code: "${dto.reasonCode}". Remarks: "${dto.remarks}" [Txn: ${txn.transactionCode}]`,
        {
          actorRole: user.role,
          storeId,
          entityType: 'INVENTORY_TRANSACTION',
          entityId: txn.id,
          reason: dto.remarks,
          source: dto.breakGlass ? 'break-glass' : 'api',
          beforeData: { remainingQuantity: currentRemaining },
          afterData: { remainingQuantity: dto.newQuantity, reasonCode: dto.reasonCode },
        },
      );

      return txn;
    });

    // Check low-stock after adjustment too
    await this.maybeAlertLowStock(dto.materialId, storeId);

    return transaction;
  }

  /** Create a transfer document; stock moves only when it is dispatched. */
  async transferMaterial(actor: SafeUser | string, dto: TransferDto) {
    const user = this.normalizeActor(actor);
    if (dto.sourceStoreId === dto.destinationStoreId) {
      throw new BadRequestException('Source and destination stores must be different');
    }
    this.resolveStoreId(user, dto.sourceStoreId);
    const stores = await this.prisma.store.findMany({
      where: { id: { in: [dto.sourceStoreId, dto.destinationStoreId] }, status: 'ACTIVE' },
      select: { id: true },
    });
    if (stores.length !== 2) {
      throw new BadRequestException('Both transfer stores must be active');
    }
    const material = await this.prisma.material.findUnique({ where: { id: dto.materialId } });
    if (!material) throw new NotFoundException(`Material ${dto.materialId} not found`);
    this.validateTraceability(material, dto, dto.quantity);

    const transferCode = `TRF-${Date.now().toString().slice(-8)}-${Math.floor(100 + Math.random() * 900)}`;
    const transfer = await this.prisma.inventoryTransfer.create({
      data: {
        transferCode,
        materialId: dto.materialId,
        sourceStoreId: dto.sourceStoreId,
        destinationStoreId: dto.destinationStoreId,
        quantity: dto.quantity,
        lotNumber: dto.lotNumber,
        batchNumber: dto.batchNumber,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        purpose: dto.purpose || 'Inter-store transfer',
        remarks: dto.remarks,
        requestedById: user.id,
      },
      include: { material: true, sourceStore: true, destinationStore: true },
    });
    await this.auditService.log(user.id, 'CREATE_TRANSFER', 'INVENTORY', `Created transfer ${transferCode}`);
    return transfer;
  }

  async dispatchTransfer(id: string, actor: SafeUser | string) {
    const user = this.normalizeActor(actor);
    const transfer = await this.prisma.inventoryTransfer.findUnique({ where: { id } });
    if (!transfer) throw new NotFoundException(`Transfer ${id} not found`);
    this.resolveStoreId(user, transfer.sourceStoreId);
    if (transfer.status === TransferStatus.DISPATCHED) return transfer;
    if (transfer.status !== TransferStatus.DRAFT) {
      throw new BadRequestException(`Only DRAFT transfers can be dispatched. Current status is ${transfer.status}`);
    }
    const result = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.inventoryTransfer.updateMany({
        where: { id, status: TransferStatus.DRAFT },
        data: { status: TransferStatus.DISPATCHED, dispatchedById: user.id, dispatchedAt: new Date() },
      });
      if (claimed.count !== 1) {
        const current = await tx.inventoryTransfer.findUnique({ where: { id } });
        if (current?.status === TransferStatus.DISPATCHED) return current;
        throw new StockConflictException('Transfer changed before dispatch; refresh and retry', {
          operation: 'TRANSFER_DISPATCH',
          materialId: transfer.materialId,
          storeId: transfer.sourceStoreId,
        });
      }

      const balance = await tx.stockBalance.findUnique({
        where: { storeId_materialId: { storeId: transfer.sourceStoreId, materialId: transfer.materialId } },
      });
      const available = (balance?.remainingQuantity ?? 0) - (balance?.reservedQuantity ?? 0);
      if (!balance || available < transfer.quantity) {
        throw new BadRequestException(`Insufficient transferable stock. Available: ${Math.max(0, available)}`);
      }
      const moved = await tx.stockBalance.updateMany({
        where: { id: balance.id, remainingQuantity: { gte: transfer.quantity }, reservedQuantity: balance.reservedQuantity },
        data: { remainingQuantity: { decrement: transfer.quantity }, quantityIssued: { increment: transfer.quantity } },
      });
      if (moved.count !== 1) {
        throw new StockConflictException('Stock changed while dispatching; refresh and retry', {
          operation: 'TRANSFER_DISPATCH',
          materialId: transfer.materialId,
          storeId: transfer.sourceStoreId,
        });
      }
      const transaction = await tx.inventoryTransaction.create({
        data: {
          transactionCode: `${transfer.transferCode}-OUT`,
          type: TransactionType.TRANSFER,
          materialId: transfer.materialId,
          storeId: transfer.sourceStoreId,
          quantity: transfer.quantity,
          issuedById: user.id,
          purpose: transfer.purpose,
          remarks: `Dispatched transfer ${transfer.transferCode}`,
        },
      });
      await this.auditService.logInTransaction(
        tx,
        user.id,
        'DISPATCH_TRANSFER',
        'INVENTORY',
        `Dispatched transfer ${transfer.transferCode}`,
        {
          actorRole: user.role,
          storeId: transfer.sourceStoreId,
          entityType: 'INVENTORY_TRANSFER',
          entityId: transfer.id,
          beforeData: { status: TransferStatus.DRAFT },
          afterData: {
            status: TransferStatus.DISPATCHED,
            quantity: transfer.quantity,
            transactionId: transaction.id,
          },
        },
      );
      return tx.inventoryTransfer.findUnique({
        where: { id },
        include: { material: true, sourceStore: true, destinationStore: true },
      });
    });
    return result;
  }

  async receiveTransfer(id: string, actor: SafeUser | string) {
    const user = this.normalizeActor(actor);
    const transfer = await this.prisma.inventoryTransfer.findUnique({ where: { id } });
    if (!transfer) throw new NotFoundException(`Transfer ${id} not found`);
    this.resolveStoreId(user, transfer.destinationStoreId);
    if (transfer.status === TransferStatus.RECEIVED) return transfer;
    if (transfer.status !== TransferStatus.DISPATCHED) {
      throw new BadRequestException(`Only DISPATCHED transfers can be received. Current status is ${transfer.status}`);
    }
    const result = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.inventoryTransfer.updateMany({
        where: { id, status: TransferStatus.DISPATCHED },
        data: { status: TransferStatus.RECEIVED, receivedById: user.id, receivedAt: new Date() },
      });
      if (claimed.count !== 1) {
        const current = await tx.inventoryTransfer.findUnique({ where: { id } });
        if (current?.status === TransferStatus.RECEIVED) return current;
        throw new StockConflictException('Transfer changed before receipt; refresh and retry', {
          operation: 'TRANSFER_RECEIVE',
          materialId: transfer.materialId,
          storeId: transfer.destinationStoreId,
        });
      }

      await tx.stockBalance.upsert({
        where: { storeId_materialId: { storeId: transfer.destinationStoreId, materialId: transfer.materialId } },
        update: { quantityReceived: { increment: transfer.quantity }, remainingQuantity: { increment: transfer.quantity } },
        create: { storeId: transfer.destinationStoreId, materialId: transfer.materialId, quantityReceived: transfer.quantity, remainingQuantity: transfer.quantity },
      });
      const transaction = await tx.inventoryTransaction.create({
        data: {
          transactionCode: `${transfer.transferCode}-IN`,
          type: TransactionType.TRANSFER,
          materialId: transfer.materialId,
          storeId: transfer.destinationStoreId,
          quantity: transfer.quantity,
          issuedById: user.id,
          purpose: transfer.purpose,
          remarks: `Received transfer ${transfer.transferCode}`,
        },
      });
      await this.auditService.logInTransaction(
        tx,
        user.id,
        'RECEIVE_TRANSFER',
        'INVENTORY',
        `Received transfer ${transfer.transferCode}`,
        {
          actorRole: user.role,
          storeId: transfer.destinationStoreId,
          entityType: 'INVENTORY_TRANSFER',
          entityId: transfer.id,
          beforeData: { status: TransferStatus.DISPATCHED },
          afterData: {
            status: TransferStatus.RECEIVED,
            quantity: transfer.quantity,
            transactionId: transaction.id,
          },
        },
      );
      return tx.inventoryTransfer.findUnique({
        where: { id },
        include: { material: true, sourceStore: true, destinationStore: true },
      });
    });
    return result;
  }

  async cancelTransfer(id: string, actor: SafeUser | string, dto: CancelTransferDto) {
    const user = this.normalizeActor(actor);
    if (!dto.remarks?.trim()) {
      throw new BadRequestException('Transfer cancellation remarks are required');
    }

    const transfer = await this.prisma.inventoryTransfer.findUnique({ where: { id } });
    if (!transfer) throw new NotFoundException(`Transfer ${id} not found`);
    this.resolveStoreId(user, transfer.sourceStoreId);
    if (transfer.status !== TransferStatus.DRAFT) {
      throw new BadRequestException(`Only DRAFT transfers can be cancelled. Current status is ${transfer.status}`);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const cancelled = await tx.inventoryTransfer.updateMany({
        where: { id, status: TransferStatus.DRAFT },
        data: {
          status: TransferStatus.CANCELLED,
          cancelledById: user.id,
          cancelledAt: new Date(),
          cancellationReasonCode: dto.reasonCode,
          cancellationRemarks: dto.remarks.trim(),
        },
      });
      if (cancelled.count !== 1) {
        throw new StockConflictException('Transfer changed before cancellation; refresh and retry', {
          operation: 'TRANSFER_CANCEL',
          materialId: transfer.materialId,
          storeId: transfer.sourceStoreId,
        });
      }
      return tx.inventoryTransfer.findUnique({
        where: { id },
        include: { material: true, sourceStore: true, destinationStore: true },
      });
    });

    await this.auditService.log(
      user.id,
      'CANCEL_TRANSFER',
      'INVENTORY',
      `Cancelled transfer ${transfer.transferCode}`,
      {
        actorRole: user.role,
        entityType: 'INVENTORY_TRANSFER',
        entityId: id,
        reason: dto.remarks.trim(),
        beforeData: { status: transfer.status },
        afterData: { status: TransferStatus.CANCELLED, reasonCode: dto.reasonCode },
      },
    );
    return result;
  }

  /** Get all inventory transactions with filter */
  async findAllTransactions(user: SafeUser, query?: {
    type?: TransactionType;
    materialId?: string;
    departmentId?: string;
    employeeId?: string;
    supplierId?: string;
  }) {
    const where: any = { ...this.accessControlService.getTransactionVisibilityWhere(user) };
    if (query?.type) where.type = query.type;
    if (query?.materialId) where.materialId = query.materialId;
    if (query?.departmentId) where.departmentId = query.departmentId;
    if (query?.employeeId) where.employeeId = query.employeeId;
    if (query?.supplierId) where.supplierId = query.supplierId;

    return this.prisma.inventoryTransaction.findMany({
      where,
      include: {
        material: { include: { category: true } },
        supplier: true,
        employee: true,
        department: true,
        request: true,
        requestItem: { select: { id: true, quantityIssued: true, quantityReturned: true } },
        issuedBy: { select: { id: true, fullName: true } },
        approvedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
