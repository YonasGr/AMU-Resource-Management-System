import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MovementService } from './movement.service';

const user = { id: 'user-1' } as any;
const movement = { id: 'movement-1', executionKey: 'request:req-1:issue' } as any;

describe('MovementService', () => {
  let prisma: any;
  let access: any;
  let service: MovementService;

  beforeEach(() => {
    const tx = {
      storeInventory: {
        findUnique: jest.fn().mockResolvedValue({ quantity: 20 }),
        update: jest.fn().mockResolvedValue({}),
        upsert: jest.fn().mockResolvedValue({}),
      },
      inventoryMovement: { create: jest.fn().mockResolvedValue(movement) },
    };
    prisma = {
      store: { findUnique: jest.fn().mockResolvedValue({ id: 'store-1', organizationId: 'org-1' }) },
      item: { findUnique: jest.fn().mockResolvedValue({ id: 'item-1' }) },
      inventoryMovement: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((callback: any) => callback(tx)),
      __tx: tx,
    };
    access = { hasScopeAccess: jest.fn().mockResolvedValue(true) };
    service = new MovementService(prisma, access);
  });

  it('enforces store scope for direct movements', async () => {
    access.hasScopeAccess.mockResolvedValue(false);

    await expect(service.applyMovement({
      itemId: 'item-1', storeId: 'store-1', quantity: 1,
      movementType: 'ISSUE', currentUser: user,
    })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('accepts fully approved workflow execution without the final actor owning the store', async () => {
    access.hasScopeAccess.mockResolvedValue(false);

    await service.applyMovement({
      itemId: 'item-1', storeId: 'store-1', quantity: 2,
      movementType: 'ISSUE', currentUser: user, authorizedByWorkflow: true,
      executionKey: 'request:req-1:issue',
    });

    expect(access.hasScopeAccess).not.toHaveBeenCalled();
    expect(prisma.__tx.inventoryMovement.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ executionKey: 'request:req-1:issue' }),
    }));
  });

  it('returns an existing movement without applying inventory twice', async () => {
    prisma.inventoryMovement.findUnique.mockResolvedValue(movement);

    const result = await service.applyMovement({
      itemId: 'item-1', storeId: 'store-1', quantity: 2,
      movementType: 'ISSUE', currentUser: user, authorizedByWorkflow: true,
      executionKey: 'request:req-1:issue',
    });

    expect(result).toBe(movement);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects an incomplete previously-recorded transfer pair', async () => {
    prisma.inventoryMovement.findUnique
      .mockResolvedValueOnce({ id: 'out' })
      .mockResolvedValueOnce(null);

    await expect(service.applyTransfer({
      itemId: 'item-1', fromStoreId: 'store-1', toStoreId: 'store-2', quantity: 2,
      currentUser: user, authorizedByWorkflow: true,
      executionKey: 'request:req-1:transfer',
    })).rejects.toBeInstanceOf(BadRequestException);
  });
});
