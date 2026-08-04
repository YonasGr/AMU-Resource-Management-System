import { BadRequestException } from '@nestjs/common';
import { PurchaseOrderService } from './purchase-order.service';

const user = { id: 'procurement-user' } as any;
const dto = {
  poNumber: 'PO-2026-001', supplierId: 'supplier-1', requestId: 'request-1',
  destinationStoreId: 'store-1',
  lines: [{ itemId: 'item-1', quantity: 60, unitPrice: 100 }],
};

describe('PurchaseOrderService', () => {
  let prisma: any;
  let service: PurchaseOrderService;

  beforeEach(() => {
    prisma = {
      request: { findUnique: jest.fn().mockResolvedValue({
        id: 'request-1', type: 'PURCHASE_REQUEST', status: 'APPROVED',
        details: { lines: [{ itemId: 'item-1', quantity: 100 }] },
        purchaseOrders: [],
      }) },
      supplier: { findUnique: jest.fn().mockResolvedValue({ id: 'supplier-1', status: 'ACTIVE' }) },
      store: { findUnique: jest.fn().mockResolvedValue({ id: 'store-1', status: 'ACTIVE' }) },
      purchaseOrder: { create: jest.fn().mockResolvedValue({ id: 'po-1' }) },
    };
    service = new PurchaseOrderService(prisma);
  });

  it('creates a multi-line-ready order against an approved request', async () => {
    await service.create(dto, user);

    expect(prisma.purchaseOrder.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        requestId: 'request-1', createdById: 'procurement-user',
        lines: { create: [expect.objectContaining({ itemId: 'item-1', orderedQuantity: 60 })] },
      }),
    }));
  });

  it('rejects orders before the purchase request is approved', async () => {
    prisma.request.findUnique.mockResolvedValue({
      id: 'request-1', type: 'PURCHASE_REQUEST', status: 'PENDING_APPROVAL',
      details: { lines: [{ itemId: 'item-1', quantity: 100 }] }, purchaseOrders: [],
    });
    await expect(service.create(dto, user)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('prevents multiple purchase orders exceeding the approved quantity', async () => {
    prisma.request.findUnique.mockResolvedValue({
      id: 'request-1', type: 'PURCHASE_REQUEST', status: 'APPROVED',
      details: { lines: [{ itemId: 'item-1', quantity: 100 }] },
      purchaseOrders: [{ status: 'ISSUED', lines: [{ itemId: 'item-1', orderedQuantity: 50 }] }],
    });
    await expect(service.create(dto, user)).rejects.toThrow('exceeds the approved quantity');
  });

  it('rejects duplicate item lines', async () => {
    await expect(service.create({
      ...dto, lines: [...dto.lines, { ...dto.lines[0] }],
    }, user)).rejects.toThrow('Each item may appear only once');
  });
});
