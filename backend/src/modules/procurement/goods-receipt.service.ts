import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SafeUser } from '../auth/decorators/current-user.decorator';
import { MovementService } from '../inventory/movement.service';
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';

@Injectable()
export class GoodsReceiptService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly movements: MovementService,
  ) {}

  async create(purchaseOrderId: string, dto: CreateGoodsReceiptDto, currentUser: SafeUser) {
    const duplicate = await this.prisma.goodsReceipt.findUnique({
      where: { receiptNumber: dto.receiptNumber },
      include: { lines: true, purchaseOrder: true },
    });
    if (duplicate) {
      if (duplicate.purchaseOrderId !== purchaseOrderId) {
        throw new BadRequestException('Receipt number is already used by another purchase order');
      }
      return duplicate;
    }
    if (new Set(dto.lines.map((line) => line.purchaseOrderLineId)).size !== dto.lines.length) {
      throw new BadRequestException('Each purchase-order line may appear only once per receipt');
    }
    if (dto.lines.some((line) =>
      line.acceptedQuantity + (line.damagedQuantity ?? 0) + (line.rejectedQuantity ?? 0) <= 0)) {
      throw new BadRequestException('Every receipt line must record at least one delivered unit');
    }

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findUnique({
        where: { id: purchaseOrderId }, include: { lines: true },
      });
      if (!order) throw new NotFoundException(`Purchase order ${purchaseOrderId} not found`);
      if (!['ISSUED', 'PARTIALLY_RECEIVED'].includes(order.status)) {
        throw new BadRequestException('Only issued purchase orders can receive goods');
      }

      const orderLines = new Map(order.lines.map((line) => [line.id, line]));
      for (const line of dto.lines) {
        if (!orderLines.has(line.purchaseOrderLineId)) {
          throw new BadRequestException(`Line ${line.purchaseOrderLineId} is not on this purchase order`);
        }
      }

      const receipt = await tx.goodsReceipt.create({
        data: {
          receiptNumber: dto.receiptNumber,
          notes: dto.notes,
          purchaseOrderId,
          storeId: order.destinationStoreId,
          receivedById: currentUser.id,
          lines: {
            create: dto.lines.map((line) => ({
              purchaseOrderLineId: line.purchaseOrderLineId,
              itemId: orderLines.get(line.purchaseOrderLineId)!.itemId,
              acceptedQuantity: line.acceptedQuantity,
              damagedQuantity: line.damagedQuantity ?? 0,
              rejectedQuantity: line.rejectedQuantity ?? 0,
              notes: line.notes,
            })),
          },
        },
        include: { lines: true },
      });

      for (const line of receipt.lines) {
        if (line.acceptedQuantity === 0) continue;
        const updated = await tx.$executeRaw`
          UPDATE "purchase_order_lines"
          SET "received_quantity" = "received_quantity" + ${line.acceptedQuantity}
          WHERE "id" = ${line.purchaseOrderLineId}
            AND "received_quantity" + ${line.acceptedQuantity} <= "ordered_quantity"
        `;
        if (updated !== 1) {
          throw new BadRequestException(`Accepted quantity exceeds the remaining ordered quantity`);
        }
        await this.movements.applyMovement({
          itemId: line.itemId,
          storeId: order.destinationStoreId,
          quantity: line.acceptedQuantity,
          movementType: 'PURCHASE_RECEIVE',
          referenceId: receipt.id,
          currentUser,
          executionKey: `goods-receipt-line:${line.id}`,
          transaction: tx,
        });
      }

      // Prisma cannot express a field-to-field comparison portably. Recheck
      // using SQL to decide whether every line has been fully accepted.
      const incomplete = await tx.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM "purchase_order_lines"
        WHERE "purchase_order_id" = ${purchaseOrderId}
          AND "received_quantity" < "ordered_quantity"
      `;
      await tx.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: { status: incomplete[0].count === 0n ? 'RECEIVED' : 'PARTIALLY_RECEIVED' },
      });

      return tx.goodsReceipt.findUniqueOrThrow({
        where: { id: receipt.id },
        include: { lines: { include: { item: true, purchaseOrderLine: true } }, purchaseOrder: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  findAll(purchaseOrderId?: string) {
    return this.prisma.goodsReceipt.findMany({
      where: { purchaseOrderId },
      include: { lines: { include: { item: true } }, purchaseOrder: true, store: true, receivedBy: true },
      orderBy: { receivedAt: 'desc' },
    });
  }
}
