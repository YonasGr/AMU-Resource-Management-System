import { BadRequestException } from '@nestjs/common';
import { GoodsReceiptService } from './goods-receipt.service';

const user = { id: 'receiver-1' } as any;
const dto = {
  receiptNumber: 'GRN-001',
  lines: [{ purchaseOrderLineId: 'po-line-1', acceptedQuantity: 40 }],
};

describe('GoodsReceiptService', () => {
  it('records accepted stock and purchase-order quantity in one transaction', async () => {
    const receipt = {
      id: 'receipt-1',
      lines: [{ id: 'receipt-line-1', purchaseOrderLineId: 'po-line-1', itemId: 'item-1', acceptedQuantity: 40 }],
    };
    const tx: any = {
      purchaseOrder: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'po-1', status: 'ISSUED', destinationStoreId: 'store-1',
          lines: [{ id: 'po-line-1', itemId: 'item-1' }],
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      goodsReceipt: {
        create: jest.fn().mockResolvedValue(receipt),
        findUniqueOrThrow: jest.fn().mockResolvedValue(receipt),
      },
      $executeRaw: jest.fn().mockResolvedValue(1),
      $queryRaw: jest.fn().mockResolvedValue([{ count: 1n }]),
    };
    const prisma: any = {
      goodsReceipt: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((callback: any) => callback(tx)),
    };
    const movements: any = { applyMovement: jest.fn().mockResolvedValue({}) };
    const service = new GoodsReceiptService(prisma, movements);

    await service.create('po-1', dto, user);

    expect(movements.applyMovement).toHaveBeenCalledWith(expect.objectContaining({
      movementType: 'PURCHASE_RECEIVE', quantity: 40,
      executionKey: 'goods-receipt-line:receipt-line-1', transaction: tx,
    }));
    expect(tx.purchaseOrder.update).toHaveBeenCalledWith({
      where: { id: 'po-1' }, data: { status: 'PARTIALLY_RECEIVED' },
    });
  });

  it('returns an existing receipt number without adding stock twice', async () => {
    const existing = { id: 'receipt-1', purchaseOrderId: 'po-1' };
    const prisma: any = {
      goodsReceipt: { findUnique: jest.fn().mockResolvedValue(existing) },
      $transaction: jest.fn(),
    };
    const service = new GoodsReceiptService(prisma, { applyMovement: jest.fn() } as any);

    await expect(service.create('po-1', dto, user)).resolves.toBe(existing);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects duplicate purchase-order lines in one receipt', async () => {
    const prisma: any = { goodsReceipt: { findUnique: jest.fn().mockResolvedValue(null) } };
    const service = new GoodsReceiptService(prisma, {} as any);
    await expect(service.create('po-1', {
      ...dto, lines: [dto.lines[0], dto.lines[0]],
    }, user)).rejects.toBeInstanceOf(BadRequestException);
  });
});
