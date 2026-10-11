import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, ScopeType, TransactionType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { AccessControlService } from '../auth/access-control.service';
import { SafeUser } from '../auth/decorators/current-user.decorator';
import {
  AdjustmentDto,
  ReturnDto,
  StockInDto,
  StockOutDto,
  TransferDto,
} from './dto/inventory.dto';

type InventoryActor = Pick<SafeUser, 'id' | 'storeId' | 'scopeType' | 'role'>;

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly auditService: AuditService,
    private readonly accessControlService: AccessControlService,
  ) {}

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

  /** Emit a low-stock alert if stock has fallen below minimum */
  private async maybeAlertLowStock(materialId: string, storeId: string) {
    const material = await this.prisma.material.findUnique({
      where: { id: materialId },
      include: { stockBalances: { where: { storeId }, take: 1 }, stockSummary: true },
    });
    const balance = material?.stockBalances?.[0] ?? material?.stockSummary;
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

    const timeStamp = Date.now().toString().slice(-6);
    const rand = Math.floor(100 + Math.random() * 900);
    const txnCode = `TXN-IN-${timeStamp}-${rand}`;

    const transaction = await this.prisma.$transaction(async (tx) => {
      const txn = await tx.inventoryTransaction.create({
        data: {
          transactionCode: txnCode,
          type: TransactionType.STOCK_IN,
          materialId: dto.materialId,
          storeId,
          quantity: dto.quantity,
          unitPrice: dto.unitPrice,
          supplierId: dto.supplierId || null,
          issuedById: user.id,
          purpose: dto.purpose || 'Stock Received',
          remarks: dto.remarks,
        },
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

    const timeStamp = Date.now().toString().slice(-6);
    const rand = Math.floor(100 + Math.random() * 900);
    const txnCode = `TXN-OUT-${timeStamp}-${rand}`;

    const transaction = await this.prisma.$transaction(async (tx) => {
      const decremented = await tx.stockBalance.updateMany({
        where: {
          materialId: dto.materialId,
          storeId,
          remainingQuantity: { gte: dto.quantity },
        },
        data: {
          quantityIssued: { increment: dto.quantity },
          remainingQuantity: { decrement: dto.quantity },
        },
      });
      if (decremented.count !== 1) {
        const available = await tx.stockBalance.findUnique({
          where: { storeId_materialId: { storeId, materialId: dto.materialId } },
          select: { remainingQuantity: true },
        });
        throw new BadRequestException(
          `Insufficient stock for "${material.name}". Requested: ${dto.quantity}, Available: ${available?.remainingQuantity ?? 0}`,
        );
      }
      await tx.stockSummary.updateMany({
        where: {
          materialId: dto.materialId,
          remainingQuantity: { gte: dto.quantity },
        },
        data: {
          quantityIssued: { increment: dto.quantity },
          remainingQuantity: { decrement: dto.quantity },
        },
      });

      const txn = await tx.inventoryTransaction.create({
        data: {
          transactionCode: txnCode,
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

      return txn;
    });

    // Check if stock fell below minimum after this operation
    await this.maybeAlertLowStock(dto.materialId, storeId);

    // Audit Log
    await this.auditService.log(
      user.id,
      'STOCK_OUT',
      'INVENTORY',
      `Issued ${dto.quantity} ${material.unit}(s) of "${material.name}" (${material.materialCode}) [Txn: ${transaction.transactionCode}]`,
    );

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

    const material = requestItem.material;

    const timeStamp = Date.now().toString().slice(-6);
    const rand = Math.floor(100 + Math.random() * 900);
    const txnCode = `TXN-RET-${timeStamp}-${rand}`;

    const transaction = await this.prisma.$transaction(async (tx) => {
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

      if (!requestItem.request.storeId) {
        throw new BadRequestException('The issued request is not assigned to a store');
      }

      await tx.stockBalance.update({
        where: {
          storeId_materialId: {
            storeId: requestItem.request.storeId,
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

      return txn;
    });

    // Audit Log
    await this.auditService.log(
      user.id,
      'RETURN',
      'INVENTORY',
      `Accepted return of ${dto.quantity} ${material.unit}(s) of "${material.name}" (${material.materialCode}) for request ${requestItem.request.requestNumber} [Txn: ${transaction.transactionCode}]`,
    );

    return transaction;
  }

  /** Stock Adjustment (Manual stock audit count adjustment) */
  async adjustStock(actor: SafeUser | string, dto: AdjustmentDto) {
    const user = this.normalizeActor(actor);
    const storeId = this.resolveStoreId(user, dto.storeId);
    const material = await this.prisma.material.findUnique({
      where: { id: dto.materialId },
      include: { stockSummary: true },
    });
    if (!material) {
      throw new NotFoundException(`Material ${dto.materialId} not found`);
    }

    const storeBalance = await this.prisma.stockBalance.findUnique({
      where: { storeId_materialId: { storeId, materialId: dto.materialId } },
    });
    const currentRemaining = storeBalance?.remainingQuantity ?? 0;
    const diff = dto.newQuantity - currentRemaining;

    const timeStamp = Date.now().toString().slice(-6);
    const rand = Math.floor(100 + Math.random() * 900);
    const txnCode = `TXN-ADJ-${timeStamp}-${rand}`;

    const transaction = await this.prisma.$transaction(async (tx) => {
      const txn = await tx.inventoryTransaction.create({
        data: {
          transactionCode: txnCode,
          type: TransactionType.ADJUSTMENT,
          materialId: dto.materialId,
          storeId,
          quantity: Math.abs(diff),
          issuedById: user.id,
          purpose: 'Stock Audit Adjustment',
          remarks: `Adjusted from ${currentRemaining} to ${dto.newQuantity}. Reason: ${dto.reason}`,
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
          remainingQuantity: dto.newQuantity,
        },
      });

      return txn;
    });

    // Check low-stock after adjustment too
    await this.maybeAlertLowStock(dto.materialId, storeId);

    // Audit Log
    await this.auditService.log(
      user.id,
      'STOCK_ADJUSTMENT',
      'INVENTORY',
      `Stock audit adjusted "${material.name}" (${material.materialCode}) from ${currentRemaining} to ${dto.newQuantity} (Delta: ${diff >= 0 ? '+' : ''}${diff}). Reason: "${dto.reason}" [Txn: ${transaction.transactionCode}]`,
    );

    return transaction;
  }

  /** Material Transfer (Transfer materials between stores or departments) */
  async transferMaterial(storekeeperId: string, dto: TransferDto) {
    throw new ConflictException(
      'Transfers are temporarily unavailable until source and destination stock locations are enabled',
    );
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
