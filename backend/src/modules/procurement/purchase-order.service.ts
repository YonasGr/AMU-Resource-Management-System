import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SafeUser } from '../auth/decorators/current-user.decorator';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';

interface PurchaseRequestDetails {
  lines: Array<{ itemId: string; quantity: number }>;
}

@Injectable()
export class PurchaseOrderService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePurchaseOrderDto, currentUser: SafeUser) {
    if (new Set(dto.lines.map((line) => line.itemId)).size !== dto.lines.length) {
      throw new BadRequestException('Each item may appear only once in a purchase order');
    }

    const [request, supplier, store] = await Promise.all([
      this.prisma.request.findUnique({
        where: { id: dto.requestId },
        include: { purchaseOrders: { include: { lines: true } } },
      }),
      this.prisma.supplier.findUnique({ where: { id: dto.supplierId } }),
      this.prisma.store.findUnique({ where: { id: dto.destinationStoreId } }),
    ]);
    if (!request || request.type !== 'PURCHASE_REQUEST') {
      throw new NotFoundException(`Approved purchase request ${dto.requestId} not found`);
    }
    if (request.status !== 'APPROVED') {
      throw new BadRequestException('Purchase orders require an approved purchase request');
    }
    if (!supplier || supplier.status !== 'ACTIVE') {
      throw new BadRequestException('An active supplier is required');
    }
    if (!store || store.status !== 'ACTIVE') {
      throw new BadRequestException('An active destination store is required');
    }

    const requested = new Map(
      (request.details as unknown as PurchaseRequestDetails).lines.map((line) => [line.itemId, line.quantity]),
    );
    const alreadyOrdered = new Map<string, number>();
    for (const order of request.purchaseOrders.filter((entry) => entry.status !== 'CANCELLED')) {
      for (const line of order.lines) {
        alreadyOrdered.set(line.itemId, (alreadyOrdered.get(line.itemId) ?? 0) + line.orderedQuantity);
      }
    }
    for (const line of dto.lines) {
      const allowed = requested.get(line.itemId);
      if (!allowed) throw new BadRequestException(`Item ${line.itemId} is not on the purchase request`);
      if ((alreadyOrdered.get(line.itemId) ?? 0) + line.quantity > allowed) {
        throw new BadRequestException(`Ordered quantity for item ${line.itemId} exceeds the approved quantity`);
      }
    }

    try {
      return await this.prisma.purchaseOrder.create({
        data: {
          poNumber: dto.poNumber,
          supplierId: dto.supplierId,
          requestId: dto.requestId,
          destinationStoreId: dto.destinationStoreId,
          createdById: currentUser.id,
          currency: dto.currency?.toUpperCase() ?? 'ETB',
          expectedDeliveryDate: dto.expectedDeliveryDate
            ? new Date(dto.expectedDeliveryDate)
            : undefined,
          notes: dto.notes,
          lines: {
            create: dto.lines.map((line) => ({
              itemId: line.itemId,
              orderedQuantity: line.quantity,
              unitPrice: new Prisma.Decimal(line.unitPrice),
            })),
          },
        },
        include: { supplier: true, destinationStore: true, lines: { include: { item: true } } },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Purchase order number ${dto.poNumber} already exists`);
      }
      throw error;
    }
  }

  findAll() {
    return this.prisma.purchaseOrder.findMany({
      include: { supplier: true, destinationStore: true, lines: { include: { item: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { supplier: true, destinationStore: true, lines: { include: { item: true } }, request: true },
    });
    if (!order) throw new NotFoundException(`Purchase order ${id} not found`);
    return order;
  }

  async issue(id: string) {
    const order = await this.findOne(id);
    if (order.status !== 'DRAFT') throw new BadRequestException('Only draft purchase orders can be issued');
    return this.prisma.purchaseOrder.update({
      where: { id }, data: { status: 'ISSUED', issuedAt: new Date() },
      include: { supplier: true, destinationStore: true, lines: { include: { item: true } } },
    });
  }

  async cancel(id: string) {
    const order = await this.findOne(id);
    if (!['DRAFT', 'ISSUED'].includes(order.status)) {
      throw new BadRequestException('A received purchase order cannot be cancelled');
    }
    if (order.lines.some((line) => line.receivedQuantity > 0)) {
      throw new BadRequestException('A purchase order with received goods cannot be cancelled');
    }
    return this.prisma.purchaseOrder.update({ where: { id }, data: { status: 'CANCELLED' } });
  }
}
