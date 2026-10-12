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
});
