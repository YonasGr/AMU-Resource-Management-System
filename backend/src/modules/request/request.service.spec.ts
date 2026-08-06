import { BadRequestException } from '@nestjs/common';
import { RequestService } from './request.service';

const currentUser = { id: 'approver-1' } as any;

function request(overrides: Record<string, unknown> = {}) {
  return {
    id: 'request-1',
    type: 'ITEM_REQUEST',
    status: 'PENDING_APPROVAL',
    requesterId: 'requester-1',
    organizationId: 'org-1',
    workflowInstanceId: 'workflow-1',
    details: { itemId: 'item-1', targetStoreId: 'store-1', quantity: 3 },
    ...overrides,
  } as any;
}

describe('RequestService approval execution', () => {
  let prisma: any;
  let workflow: any;
  let movement: any;
  let service: RequestService;

  beforeEach(() => {
    prisma = {
      request: {
        findUnique: jest.fn(),
        update: jest.fn(({ data }: any) => Promise.resolve(request(data))),
      },
    };
    workflow = { approve: jest.fn().mockResolvedValue({ status: 'APPROVED' }) };
    movement = {
      applyMovement: jest.fn().mockResolvedValue({}),
      applyTransfer: jest.fn().mockResolvedValue({}),
    };
    service = new RequestService(prisma, workflow, movement, {} as any);
  });

  it('passes a stable execution key after final item-request approval', async () => {
    prisma.request.findUnique.mockResolvedValue(request());

    await service.approve('request-1', currentUser);

    expect(movement.applyMovement).toHaveBeenCalledWith(expect.objectContaining({
      authorizedByWorkflow: true,
      executionKey: 'request:request-1:issue',
    }));
    expect(prisma.request.update).toHaveBeenLastCalledWith({
      where: { id: 'request-1' }, data: { status: 'COMPLETED' },
    });
  });

  it('retries execution without trying to approve a terminal workflow again', async () => {
    prisma.request.findUnique.mockResolvedValue(request({ status: 'APPROVED' }));

    await service.approve('request-1', currentUser);

    expect(workflow.approve).not.toHaveBeenCalled();
    expect(movement.applyMovement).toHaveBeenCalledTimes(1);
  });

  it('returns an already completed request without executing twice', async () => {
    const completed = request({ status: 'COMPLETED' });
    prisma.request.findUnique.mockResolvedValue(completed);

    await expect(service.approve('request-1', currentUser)).resolves.toBe(completed);
    expect(workflow.approve).not.toHaveBeenCalled();
    expect(movement.applyMovement).not.toHaveBeenCalled();
  });

  it('does not complete the request when inventory execution fails', async () => {
    prisma.request.findUnique.mockResolvedValue(request());
    movement.applyMovement.mockRejectedValue(new BadRequestException('Insufficient stock'));

    await expect(service.approve('request-1', currentUser)).rejects.toThrow('Insufficient stock');
    expect(prisma.request.update).not.toHaveBeenCalledWith({
      where: { id: 'request-1' }, data: { status: 'COMPLETED' },
    });
  });

  it('leaves an approved purchase request ready for procurement without moving stock', async () => {
    const purchaseRequest = request({
      type: 'PURCHASE_REQUEST',
      details: { lines: [{ itemId: 'item-1', quantity: 100 }] },
    });
    prisma.request.findUnique.mockResolvedValue(purchaseRequest);
    prisma.request.update.mockImplementation(({ data }: any) =>
      Promise.resolve({ ...purchaseRequest, ...data }),
    );

    const result = await service.approve('request-1', currentUser);

    expect(result.status).toBe('APPROVED');
    expect(movement.applyMovement).not.toHaveBeenCalled();
    expect(movement.applyTransfer).not.toHaveBeenCalled();
    expect(prisma.request.update).not.toHaveBeenCalledWith({
      where: { id: 'request-1' }, data: { status: 'COMPLETED' },
    });
  });

  it('creates one approved borrow transaction without moving stock', async () => {
    const borrowRequest = request({
      type: 'BORROW_REQUEST',
      details: { assetId: 'asset-1', targetStoreId: 'store-1', purpose: 'Teaching', expectedReturnDate: '2026-09-01' },
    });
    const tx = {
      borrowTransaction: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'loan-1' }),
      },
      asset: { findUnique: jest.fn().mockResolvedValue({ id: 'asset-1', assetTag: 'AMU-1', storeId: 'store-1', status: 'AVAILABLE' }) },
      assetHistory: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma.$transaction = jest.fn((callback: any) => callback(tx));
    prisma.request.update.mockResolvedValue({ ...borrowRequest, status: 'APPROVED' });

    const result = await (service as any).execute(borrowRequest, currentUser);

    expect(result.status).toBe('APPROVED');
    expect(tx.borrowTransaction.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ requestId: 'request-1', assetId: 'asset-1' }) }));
    expect(movement.applyMovement).not.toHaveBeenCalled();
  });

  it('disposes an eligible asset atomically with a stable movement key', async () => {
    const disposalRequest = request({
      type: 'DISPOSAL_REQUEST',
      details: { assetId: 'asset-1', targetStoreId: 'store-1', reason: 'Beyond repair', method: 'Recycler' },
    });
    const tx = {
      disposalRecord: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'disposal-1' }) },
      asset: {
        findUnique: jest.fn().mockResolvedValue({ id: 'asset-1', itemId: 'item-1', storeId: 'store-1', status: 'AVAILABLE' }),
        update: jest.fn().mockResolvedValue({}),
      },
      assetHistory: { create: jest.fn().mockResolvedValue({}) },
      request: { update: jest.fn().mockResolvedValue({ ...disposalRequest, status: 'COMPLETED' }) },
    };
    prisma.$transaction = jest.fn((callback: any) => callback(tx));

    const result = await (service as any).execute(disposalRequest, currentUser);

    expect(result.status).toBe('COMPLETED');
    expect(movement.applyMovement).toHaveBeenCalledWith(expect.objectContaining({
      movementType: 'DISPOSAL', executionKey: 'request:request-1:disposal', transaction: tx,
    }));
    expect(tx.asset.update).toHaveBeenCalledWith({ where: { id: 'asset-1' }, data: { status: 'DISPOSED' } });
  });
});
