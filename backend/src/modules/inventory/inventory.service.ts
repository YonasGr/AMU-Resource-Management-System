import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

export interface StockInDto {
  materialId: string;
  quantity: number;
  unitPrice?: number;
  supplierId?: string;
  purpose?: string;
  remarks?: string;
}

export interface StockOutDto {
  materialId: string;
  quantity: number;
  employeeId?: string;
  departmentId?: string;
  purpose?: string;
  remarks?: string;
}

export interface ReturnDto {
  materialId: string;
  quantity: number;
  employeeId?: string;
  departmentId?: string;
  remarks?: string;
}

export interface AdjustmentDto {
  materialId: string;
  newQuantity: number;
  reason: string;
}

export interface TransferDto {
  materialId: string;
  quantity: number;
  toDepartmentId: string;
  purpose?: string;
  remarks?: string;
}

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Emit a low-stock alert if stock has fallen below minimum */
  private async maybeAlertLowStock(materialId: string) {
    const material = await this.prisma.material.findUnique({
      where: { id: materialId },
      include: { stockSummary: true },
    });
    if (!material || !material.stockSummary) return;

    const { remainingQuantity } = material.stockSummary;
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
  async stockIn(storekeeperId: string, dto: StockInDto) {
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
          quantity: dto.quantity,
          unitPrice: dto.unitPrice,
          supplierId: dto.supplierId || null,
          issuedById: storekeeperId,
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

    return transaction;
  }

  /** Direct Stock Out (Issue materials directly to employee / department) */
  async stockOut(storekeeperId: string, dto: StockOutDto) {
    const material = await this.prisma.material.findUnique({
      where: { id: dto.materialId },
      include: { stockSummary: true },
    });
    if (!material) {
      throw new NotFoundException(`Material ${dto.materialId} not found`);
    }

    const available = material.stockSummary?.remainingQuantity ?? 0;
    if (available < dto.quantity) {
      throw new BadRequestException(
        `Cannot issue ${dto.quantity} ${material.unit}(s). Only ${available} available in stock.`,
      );
    }

    const timeStamp = Date.now().toString().slice(-6);
    const rand = Math.floor(100 + Math.random() * 900);
    const txnCode = `TXN-OUT-${timeStamp}-${rand}`;

    const transaction = await this.prisma.$transaction(async (tx) => {
      const txn = await tx.inventoryTransaction.create({
        data: {
          transactionCode: txnCode,
          type: TransactionType.STOCK_OUT,
          materialId: dto.materialId,
          quantity: dto.quantity,
          employeeId: dto.employeeId || null,
          departmentId: dto.departmentId || null,
          issuedById: storekeeperId,
          purpose: dto.purpose || 'Direct Issue',
          remarks: dto.remarks,
        },
        include: {
          material: true,
          employee: true,
          department: true,
          issuedBy: { select: { fullName: true } },
        },
      });

      await tx.stockSummary.update({
        where: { materialId: dto.materialId },
        data: {
          quantityIssued: { increment: dto.quantity },
          remainingQuantity: { decrement: dto.quantity },
        },
      });

      return txn;
    });

    // Check if stock fell below minimum after this operation
    await this.maybeAlertLowStock(dto.materialId);

    return transaction;
  }

  /** Material Return (Record returned materials back into inventory) */
  async returnMaterial(storekeeperId: string, dto: ReturnDto) {
    const material = await this.prisma.material.findUnique({
      where: { id: dto.materialId },
      include: { stockSummary: true },
    });
    if (!material) {
      throw new NotFoundException(`Material ${dto.materialId} not found`);
    }

    const timeStamp = Date.now().toString().slice(-6);
    const rand = Math.floor(100 + Math.random() * 900);
    const txnCode = `TXN-RET-${timeStamp}-${rand}`;

    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.inventoryTransaction.create({
        data: {
          transactionCode: txnCode,
          type: TransactionType.RETURN,
          materialId: dto.materialId,
          quantity: dto.quantity,
          employeeId: dto.employeeId || null,
          departmentId: dto.departmentId || null,
          issuedById: storekeeperId,
          purpose: 'Material Return',
          remarks: dto.remarks || 'Returned to store',
        },
        include: {
          material: true,
          employee: true,
          department: true,
          issuedBy: { select: { fullName: true } },
        },
      });

      await tx.stockSummary.update({
        where: { materialId: dto.materialId },
        data: {
          quantityIssued: { decrement: dto.quantity },
          remainingQuantity: { increment: dto.quantity },
        },
      });

      return transaction;
    });
  }

  /** Stock Adjustment (Manual stock audit count adjustment) */
  async adjustStock(storekeeperId: string, dto: AdjustmentDto) {
    const material = await this.prisma.material.findUnique({
      where: { id: dto.materialId },
      include: { stockSummary: true },
    });
    if (!material) {
      throw new NotFoundException(`Material ${dto.materialId} not found`);
    }

    const currentRemaining = material.stockSummary?.remainingQuantity ?? 0;
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
          quantity: Math.abs(diff),
          issuedById: storekeeperId,
          purpose: 'Stock Audit Adjustment',
          remarks: `Adjusted from ${currentRemaining} to ${dto.newQuantity}. Reason: ${dto.reason}`,
        },
        include: {
          material: true,
          issuedBy: { select: { fullName: true } },
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
    await this.maybeAlertLowStock(dto.materialId);

    return transaction;
  }

  /** Material Transfer (Transfer materials between stores or departments) */
  async transferMaterial(storekeeperId: string, dto: TransferDto) {
    const material = await this.prisma.material.findUnique({
      where: { id: dto.materialId },
      include: { stockSummary: true },
    });
    if (!material) {
      throw new NotFoundException(`Material ${dto.materialId} not found`);
    }

    const available = material.stockSummary?.remainingQuantity ?? 0;
    if (available < dto.quantity) {
      throw new BadRequestException(
        `Cannot transfer ${dto.quantity} ${material.unit}(s). Only ${available} available in stock.`,
      );
    }

    const timeStamp = Date.now().toString().slice(-6);
    const rand = Math.floor(100 + Math.random() * 900);
    const txnCode = `TXN-TRF-${timeStamp}-${rand}`;

    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.inventoryTransaction.create({
        data: {
          transactionCode: txnCode,
          type: TransactionType.TRANSFER,
          materialId: dto.materialId,
          quantity: dto.quantity,
          departmentId: dto.toDepartmentId,
          issuedById: storekeeperId,
          purpose: dto.purpose || 'Inter-Department Material Transfer',
          remarks: dto.remarks || `Transferred to department`,
        },
        include: {
          material: true,
          department: true,
          issuedBy: { select: { fullName: true } },
        },
      });

      return transaction;
    });
  }

  /** Get all inventory transactions with filter */
  async findAllTransactions(query?: {
    type?: TransactionType;
    materialId?: string;
    departmentId?: string;
    employeeId?: string;
    supplierId?: string;
  }) {
    const where: any = {};
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
        issuedBy: { select: { id: true, fullName: true } },
        approvedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
