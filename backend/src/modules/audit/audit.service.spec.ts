import { AuditService } from './audit.service';

describe('AuditService', () => {
  it('queues structured audit data with generated correlation identity', async () => {
    const outbox = { enqueue: jest.fn().mockResolvedValue({ count: 1 }) };
    const prisma = { auditLog: { findMany: jest.fn() } };
    const service = new AuditService(prisma as never, outbox as never);

    await service.log('user-1', 'UPDATE_USER', 'USERS', 'Changed role', {
      actorRole: 'ADMINISTRATOR',
      entityType: 'User',
      entityId: 'user-2',
      reason: 'Access review',
      beforeData: { role: 'REQUESTER' },
      afterData: { role: 'STORE_MANAGER' },
      ipAddress: '192.0.2.10',
      userAgent: 'test-agent',
    });

    expect(outbox.enqueue).toHaveBeenCalledWith(
      'AUDIT_LOG',
      expect.objectContaining({
        userId: 'user-1',
        actorRole: 'ADMINISTRATOR',
        action: 'UPDATE_USER',
        module: 'USERS',
        entityType: 'User',
        entityId: 'user-2',
        correlationId: expect.any(String),
        reason: 'Access review',
        source: 'api',
        beforeData: { role: 'REQUESTER' },
        afterData: { role: 'STORE_MANAGER' },
      }),
    );
  });

  it('preserves an explicitly supplied correlation id', async () => {
    const outbox = { enqueue: jest.fn().mockResolvedValue({ count: 1 }) };
    const service = new AuditService({} as never, outbox as never);

    await service.log(null, 'SYSTEM_CHECK', 'SYSTEM', undefined, {
      correlationId: 'correlation-1',
      source: 'job',
    });

    expect(outbox.enqueue).toHaveBeenCalledWith(
      'AUDIT_LOG',
      expect.objectContaining({ correlationId: 'correlation-1', source: 'job' }),
    );
  });

  it('preserves reversal linkage in structured audit payloads', async () => {
    const outbox = { enqueue: jest.fn().mockResolvedValue({ count: 1 }) };
    const service = new AuditService({} as never, outbox as never);

    await service.log(null, 'REVERSE_STOCK_OUT', 'INVENTORY', 'Corrected issue', {
      correlationId: 'correction-1',
      reversalOfId: 'original-audit-1',
    });

    expect(outbox.enqueue).toHaveBeenCalledWith(
      'AUDIT_LOG',
      expect.objectContaining({
        correlationId: 'correction-1',
        reversalOfId: 'original-audit-1',
      }),
    );
  });

  it('writes an audit outbox event through the supplied transaction client', async () => {
    const outboxEvent = { createMany: jest.fn().mockResolvedValue({ count: 1 }) };
    const service = new AuditService({} as never, {} as never);

    await service.logInTransaction(
      { outboxEvent } as never,
      'user-1',
      'POST_GOODS_RECEIPT',
      'INVENTORY',
      'Posted receipt',
      {
        actorRole: 'STORE_MANAGER',
        entityType: 'GOODS_RECEIPT',
        entityId: 'receipt-1',
        beforeData: { status: 'INSPECTED' },
        afterData: { status: 'POSTED' },
      },
    );

    expect(outboxEvent.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({
        eventKey: expect.any(String),
        eventType: 'AUDIT_LOG',
        payload: expect.objectContaining({
          userId: 'user-1',
          action: 'POST_GOODS_RECEIPT',
          entityType: 'GOODS_RECEIPT',
          entityId: 'receipt-1',
          correlationId: expect.any(String),
        }),
      })],
      skipDuplicates: true,
    });
  });

  it('uses the correlation id as an idempotent transaction event key', async () => {
    const outboxEvent = { createMany: jest.fn().mockResolvedValue({ count: 0 }) };
    const service = new AuditService({} as never, {} as never);
    const tx = { outboxEvent } as never;

    await service.logInTransaction(tx, 'user-1', 'STOCK_OUT', 'INVENTORY', 'Issued stock', {
      correlationId: 'operation-1',
    });
    await service.logInTransaction(tx, 'user-1', 'STOCK_OUT', 'INVENTORY', 'Issued stock', {
      correlationId: 'operation-1',
    });

    expect(outboxEvent.createMany).toHaveBeenCalledTimes(2);
    expect(outboxEvent.createMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: [expect.objectContaining({ eventKey: 'operation-1' })],
        skipDuplicates: true,
      }),
    );
    expect(outboxEvent.createMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: [expect.objectContaining({ eventKey: 'operation-1' })],
        skipDuplicates: true,
      }),
    );
  });

  it('returns filtered audit pages with stable ordering and totals', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'audit-1' }]);
    const count = jest.fn().mockResolvedValue(3);
    const prisma = {
      auditLog: { findMany, count },
      $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
    };
    const service = new AuditService(prisma as never, {} as never);

    await expect(
      service.findAll({
        page: 2,
        pageSize: 1,
        action: 'STOCK_OUT',
        actorId: '11111111-1111-4111-8111-111111111111',
        entityType: 'INVENTORY_TRANSACTION',
        storeId: 'store-1',
        deviceId: 'scanner-7',
        search: 'issued',
        from: '2026-10-01T00:00:00.000Z',
        to: '2026-10-13T23:59:59.999Z',
      }),
    ).resolves.toEqual({
      items: [{ id: 'audit-1' }],
      page: 2,
      pageSize: 1,
      total: 3,
      totalPages: 3,
    });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        action: 'STOCK_OUT',
        userId: '11111111-1111-4111-8111-111111111111',
        entityType: 'INVENTORY_TRANSACTION',
        storeId: 'store-1',
        deviceId: 'scanner-7',
        OR: [
          { details: { contains: 'issued', mode: 'insensitive' } },
          { reason: { contains: 'issued', mode: 'insensitive' } },
        ],
      }),
      skip: 1,
      take: 1,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    }));
    expect(count).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ action: 'STOCK_OUT' }),
    }));
  });
});
