import { ForbiddenException } from '@nestjs/common';
import { DistributionService } from './distribution.service';

const user = { id: 'dest-manager' } as any;

function allocation() {
  return {
    id: 'allocation-1', itemId: 'item-1', destinationStoreId: 'dest-store',
    distributionPlanId: 'plan-1', quantity: 25, status: 'PENDING',
    destinationStore: { id: 'dest-store', organizationId: 'org-2' },
    distributionPlan: { id: 'plan-1', sourceStoreId: 'source-store', status: 'ACTIVE' },
  };
}

describe('DistributionService confirmation', () => {
  let prisma: any;
  let movements: any;
  let access: any;
  let service: DistributionService;

  beforeEach(() => {
    const tx = {
      distributionAllocation: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        count: jest.fn().mockResolvedValue(0),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ ...allocation(), status: 'CONFIRMED' }),
      },
      distributionPlan: { update: jest.fn().mockResolvedValue({}) },
    };
    prisma = {
      distributionAllocation: { findUnique: jest.fn().mockResolvedValue(allocation()) },
      $transaction: jest.fn((callback: any) => callback(tx)),
      __tx: tx,
    };
    movements = { applyTransfer: jest.fn().mockResolvedValue({}) };
    access = { hasScopeAccess: jest.fn().mockResolvedValue(true) };
    service = new DistributionService(prisma, movements, access);
  });

  it('requires destination-store scope', async () => {
    access.hasScopeAccess.mockResolvedValue(false);
    await expect(service.confirm('allocation-1', user)).rejects.toBeInstanceOf(ForbiddenException);
    expect(movements.applyTransfer).not.toHaveBeenCalled();
  });

  it('transfers an allocation with a stable exactly-once key and completes the plan', async () => {
    await service.confirm('allocation-1', user);

    expect(movements.applyTransfer).toHaveBeenCalledWith(expect.objectContaining({
      fromStoreId: 'source-store', toStoreId: 'dest-store', quantity: 25,
      authorizedByWorkflow: true,
      executionKey: 'distribution-allocation:allocation-1',
    }));
    expect(prisma.__tx.distributionPlan.update).toHaveBeenCalledWith({
      where: { id: 'plan-1' }, data: { status: 'COMPLETED' },
    });
  });

  it('returns a confirmed allocation without transferring twice', async () => {
    const confirmed = { ...allocation(), status: 'CONFIRMED' };
    prisma.distributionAllocation.findUnique.mockResolvedValue(confirmed);
    await expect(service.confirm('allocation-1', user)).resolves.toBe(confirmed);
    expect(movements.applyTransfer).not.toHaveBeenCalled();
  });
});
