import { OutboxService } from './outbox.service';

describe('OutboxService', () => {
  let service: OutboxService;
  let outboxEvent: {
    createMany: jest.Mock;
    findMany: jest.Mock;
    updateMany: jest.Mock;
    update: jest.Mock;
  };
  let prisma: {
    outboxEvent: typeof outboxEvent;
    auditLog: { create: jest.Mock };
    notification: { createMany: jest.Mock };
  };

  beforeEach(() => {
    outboxEvent = {
      createMany: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    };
    prisma = {
      outboxEvent,
      auditLog: { create: jest.fn() },
      notification: { createMany: jest.fn() },
    };
    service = new OutboxService(prisma as never);
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('enqueues an event with a generated key', async () => {
    outboxEvent.createMany.mockResolvedValue({ count: 1 });

    await service.enqueue('AUDIT_LOG', {
      userId: 'user-1',
      action: 'CREATE',
      module: 'requests',
      correlationId: 'correlation-1',
      source: 'api',
    });

    expect(outboxEvent.createMany).toHaveBeenCalledWith({
      data: {
        eventKey: expect.any(String),
        eventType: 'AUDIT_LOG',
        payload: {
          userId: 'user-1',
          action: 'CREATE',
          module: 'requests',
          correlationId: 'correlation-1',
          source: 'api',
        },
      },
      skipDuplicates: true,
    });
  });

  it('uses duplicate-safe enqueueing for a caller-provided event key', async () => {
    outboxEvent.createMany.mockResolvedValue({ count: 0 });

    await service.enqueue(
      'AUDIT_LOG',
      {
        userId: null,
        action: 'UPDATE',
        module: 'inventory',
        correlationId: 'correlation-2',
        source: 'api',
      },
      '11111111-1111-4111-8111-111111111111',
    );

    expect(outboxEvent.createMany).toHaveBeenCalledWith({
      data: {
        eventKey: '11111111-1111-4111-8111-111111111111',
        eventType: 'AUDIT_LOG',
        payload: {
          userId: null,
          action: 'UPDATE',
          module: 'inventory',
          correlationId: 'correlation-2',
          source: 'api',
        },
      },
      skipDuplicates: true,
    });
  });

  it('claims and marks a dispatched event as processed', async () => {
    const event = {
      id: 'event-1',
      eventKey: 'key-1',
      eventType: 'AUDIT_LOG',
      payload: { userId: null, action: 'CREATE', module: 'requests' },
      status: 'PENDING' as const,
      attempts: 0,
    };
    outboxEvent.findMany.mockResolvedValue([event]);
    outboxEvent.updateMany.mockResolvedValue({ count: 1 });
    outboxEvent.update.mockResolvedValue({});
    prisma.auditLog.create.mockResolvedValue({});

    await service.processPending();

    expect(prisma.auditLog.create).toHaveBeenCalledWith({ data: event.payload });
    expect(outboxEvent.update).toHaveBeenCalledWith({
      where: { id: 'event-1' },
      data: {
        status: 'PROCESSED',
        processedAt: expect.any(Date),
        lastError: null,
      },
    });
  });

  it('does not process an event another worker claimed first', async () => {
    const event = {
      id: 'event-1',
      eventKey: 'key-1',
      eventType: 'AUDIT_LOG',
      payload: { userId: null, action: 'CREATE', module: 'requests' },
      status: 'PENDING' as const,
      attempts: 0,
    };
    outboxEvent.findMany.mockResolvedValue([event]);
    outboxEvent.updateMany.mockResolvedValue({ count: 0 });

    await service.processPending();

    expect(prisma.auditLog.create).not.toHaveBeenCalled();
    expect(outboxEvent.update).not.toHaveBeenCalled();
  });

  it('marks failed events for retry with the processing error', async () => {
    const event = {
      id: 'event-1',
      eventKey: 'key-1',
      eventType: 'UNSUPPORTED',
      payload: {},
      status: 'FAILED' as const,
      attempts: 1,
    };
    outboxEvent.findMany.mockResolvedValue([event]);
    outboxEvent.updateMany.mockResolvedValue({ count: 1 });
    outboxEvent.update.mockResolvedValue({});

    await service.processPending();

    expect(outboxEvent.update).toHaveBeenCalledWith({
      where: { id: 'event-1' },
      data: {
        status: 'FAILED',
        lastError: 'Unsupported outbox event type: UNSUPPORTED',
        availableAt: expect.any(Date),
      },
    });
  });

  it('dispatches notification batches to the notification table', async () => {
    const event = {
      id: 'event-1',
      eventKey: 'key-1',
      eventType: 'NOTIFICATION_BATCH',
      payload: {
        userIds: ['user-1', 'user-2'],
        type: 'REQUEST_APPROVED',
        title: 'Approved',
        message: 'Request approved',
      },
      status: 'PENDING' as const,
      attempts: 0,
    };
    outboxEvent.findMany.mockResolvedValue([event]);
    outboxEvent.updateMany.mockResolvedValue({ count: 1 });
    outboxEvent.update.mockResolvedValue({});
    prisma.notification.createMany.mockResolvedValue({});

    await service.processPending();

    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'user-1',
          type: 'REQUEST_APPROVED',
          title: 'Approved',
          message: 'Request approved',
          metadata: undefined,
        },
        {
          userId: 'user-2',
          type: 'REQUEST_APPROVED',
          title: 'Approved',
          message: 'Request approved',
          metadata: undefined,
        },
      ],
      skipDuplicates: true,
    });
  });

  it('clears the polling timer on module shutdown', () => {
    jest.useFakeTimers();
    service.onModuleInit();
    service.onModuleDestroy();

    expect(jest.getTimerCount()).toBe(0);
    jest.useRealTimers();
  });
});
