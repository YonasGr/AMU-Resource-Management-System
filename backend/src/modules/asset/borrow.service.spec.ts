import { BorrowService } from './borrow.service';

const user = { id: 'user-1' } as any;
const loan = {
  id: 'loan-1', requestId: 'request-1', assetId: 'asset-1', storeId: 'store-1', borrowerId: 'user-1',
  status: 'APPROVED', asset: { id: 'asset-1', itemId: 'item-1', status: 'AVAILABLE', assignedOrganizationId: null },
  store: { id: 'store-1', organizationId: 'org-1' },
};

describe('BorrowService lifecycle', () => {
  let tx: any;
  let prisma: any;
  let movements: any;
  let service: BorrowService;

  beforeEach(() => {
    tx = {
      borrowTransaction: {
        findUnique: jest.fn().mockResolvedValue(loan),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(loan),
      },
      asset: { update: jest.fn().mockResolvedValue({}) },
      assetHistory: { create: jest.fn().mockResolvedValue({}) },
      request: { update: jest.fn().mockResolvedValue({}) },
    };
    prisma = { $transaction: jest.fn((callback: any) => callback(tx)) };
    movements = { applyMovement: jest.fn().mockResolvedValue({}) };
    const access = { hasScopeAccess: jest.fn().mockResolvedValue(true) };
    service = new BorrowService(prisma, movements, access as any);
  });

  it('issues exactly one asset and completes the approved request', async () => {
    await service.issue('loan-1', 'Collected with charger', user);
    expect(tx.borrowTransaction.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'loan-1', status: 'APPROVED' } }));
    expect(movements.applyMovement).toHaveBeenCalledWith(expect.objectContaining({
      movementType: 'ISSUE', quantity: 1, executionKey: 'borrow:loan-1:issue', transaction: tx,
    }));
    expect(tx.asset.update).toHaveBeenCalledWith({ where: { id: 'asset-1' }, data: { status: 'BORROWED' } });
    expect(tx.request.update).toHaveBeenCalledWith({ where: { id: 'request-1' }, data: { status: 'COMPLETED' } });
  });

  it('returns an issued asset into inspection and restores inventory', async () => {
    tx.borrowTransaction.findUnique.mockResolvedValue({ ...loan, status: 'ISSUED', asset: { ...loan.asset, status: 'BORROWED' } });
    await service.returnAsset('loan-1', 'Returned at counter', user);
    expect(movements.applyMovement).toHaveBeenCalledWith(expect.objectContaining({
      movementType: 'RETURN', quantity: 1, executionKey: 'borrow:loan-1:return', transaction: tx,
    }));
    expect(tx.asset.update).toHaveBeenCalledWith({ where: { id: 'asset-1' }, data: { status: 'UNDER_INSPECTION' } });
  });

  it('routes damaged returned assets to maintenance after inspection', async () => {
    tx.borrowTransaction.findUnique.mockResolvedValue({ ...loan, status: 'RETURNED_PENDING_INSPECTION' });
    await service.inspect('loan-1', 'DAMAGED', 'Cracked display', user);
    expect(tx.asset.update).toHaveBeenCalledWith({
      where: { id: 'asset-1' }, data: { condition: 'DAMAGED', status: 'UNDER_MAINTENANCE' },
    });
  });
});
