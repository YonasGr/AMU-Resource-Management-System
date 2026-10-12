import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PurchaseOrderStatus, Role, ScopeType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SafeUser } from '../auth/decorators/current-user.decorator';
import { CreatePurchaseOrderDto } from './dto/purchase-order.dto';

@Injectable()
export class ProcurementService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  private ensureStoreAccess(user: SafeUser, storeId: string) {
    if (user.scopeType === ScopeType.STORE && user.storeId !== storeId) {
      throw new ForbiddenException('You cannot access procurement for another store');
    }
  }

  private ensureManager(user: SafeUser) {
    if (user.role !== Role.ADMINISTRATOR && user.role !== Role.STORE_MANAGER) {
      throw new ForbiddenException('Only administrators and store managers can approve procurement');
    }
  }

  async create(user: SafeUser, dto: CreatePurchaseOrderDto) {
    this.ensureStoreAccess(user, dto.storeId);
    const materialIds = dto.lines.map((line) => line.materialId);
    if (new Set(materialIds).size !== materialIds.length) {
      throw new BadRequestException('A material may appear only once on a purchase order');
    }
    const [supplier, store, materials] = await Promise.all([
      this.prisma.supplier.findFirst({ where: { id: dto.supplierId, status: 'ACTIVE' } }),
      this.prisma.store.findFirst({ where: { id: dto.storeId, status: 'ACTIVE' } }),
      this.prisma.material.findMany({ where: { id: { in: materialIds }, status: 'ACTIVE' }, select: { id: true } }),
    ]);
    if (!supplier) throw new BadRequestException('The supplier is not active');
    if (!store) throw new BadRequestException('The destination store is not active');
    if (materials.length !== materialIds.length) throw new BadRequestException('One or more materials are not active');

    const orderNumber = `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-8)}`;
    const order = await this.prisma.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId: dto.supplierId,
        storeId: dto.storeId,
        purpose: dto.purpose,
        remarks: dto.remarks,
        createdById: user.id,
        lines: {
          create: dto.lines.map((line) => ({
            materialId: line.materialId,
            quantityOrdered: line.quantityOrdered,
            unitPrice: line.unitPrice,
            remarks: line.remarks,
          })),
        },
      },
      include: { supplier: true, store: true, lines: { include: { material: true } } },
    });
    await this.audit.log(user.id, 'CREATE_PURCHASE_ORDER', 'PROCUREMENT', `Created purchase order ${order.orderNumber}`, {
      entityType: 'PurchaseOrder',
      entityId: order.id,
      actorRole: user.role,
      afterData: order,
    });
    return order;
  }

  async findAll(user: SafeUser) {
    return this.prisma.purchaseOrder.findMany({
      where: user.scopeType === ScopeType.STORE && user.storeId ? { storeId: user.storeId } : undefined,
      include: { supplier: true, store: true, lines: { include: { material: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(user: SafeUser, id: string) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { supplier: true, store: true, lines: { include: { material: true, goodsReceipts: true } } },
    });
    if (!order) throw new NotFoundException(`Purchase order ${id} not found`);
    this.ensureStoreAccess(user, order.storeId);
    return order;
  }

  private async transition(user: SafeUser, id: string, from: PurchaseOrderStatus, to: PurchaseOrderStatus) {
    this.ensureManager(user);
    const order = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`Purchase order ${id} not found`);
    this.ensureStoreAccess(user, order.storeId);
    if (to === PurchaseOrderStatus.APPROVED && order.createdById === user.id) {
      throw new ForbiddenException('The person who created a purchase order cannot approve it');
    }
    if (order.status !== from) throw new BadRequestException(`Only ${from} purchase orders can move to ${to}`);
    const data =
      to === PurchaseOrderStatus.APPROVED
        ? { status: to, approvedById: user.id, approvedAt: new Date() }
        : to === PurchaseOrderStatus.SUBMITTED
          ? { status: to, submittedAt: new Date() }
          : to === PurchaseOrderStatus.CANCELLED
            ? { status: to, cancelledAt: new Date() }
            : { status: to };
    const updated = await this.prisma.purchaseOrder.update({ where: { id }, data });
    await this.audit.log(user.id, `PURCHASE_ORDER_${to}`, 'PROCUREMENT', `${order.orderNumber} moved to ${to}`, {
      entityType: 'PurchaseOrder',
      entityId: id,
      actorRole: user.role,
      beforeData: order,
      afterData: updated,
    });
    return updated;
  }

  submit(user: SafeUser, id: string) {
    return this.transition(user, id, PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.SUBMITTED);
  }

  approve(user: SafeUser, id: string) {
    return this.transition(user, id, PurchaseOrderStatus.SUBMITTED, PurchaseOrderStatus.APPROVED);
  }

  reject(user: SafeUser, id: string) {
    return this.transition(user, id, PurchaseOrderStatus.SUBMITTED, PurchaseOrderStatus.REJECTED);
  }

  cancel(user: SafeUser, id: string) {
    return this.transition(user, id, PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.CANCELLED);
  }
}
