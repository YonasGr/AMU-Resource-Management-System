import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';

type AuditPayload = {
  userId: string | null;
  action: string;
  module: string;
  details?: string;
  ipAddress?: string;
};

type NotificationPayload = {
  userIds: string[];
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
};

type OutboxEventRecord = {
  id: string;
  eventKey: string;
  eventType: string;
  payload: unknown;
  status: 'PENDING' | 'PROCESSING' | 'FAILED';
  attempts: number;
  updatedAt: Date;
};

type OutboxClient = {
  createMany(args: {
    data: {
      eventKey: string;
      eventType: string;
      payload: unknown;
    };
    skipDuplicates: boolean;
  }): Promise<unknown>;
  findMany(args: {
    where: {
      OR: Array<
        | {
            status: { in: Array<'PENDING' | 'FAILED'> };
            availableAt: { lte: Date };
          }
        | {
            status: 'PROCESSING';
            updatedAt: { lte: Date };
          }
      >;
      attempts: { lt: number };
    };
    orderBy: { createdAt: 'asc' };
    take: number;
  }): Promise<OutboxEventRecord[]>;
  updateMany(args: {
    where: { id: string; status: 'PENDING' | 'PROCESSING' | 'FAILED'; attempts: number };
    data: { status: 'PROCESSING'; attempts: { increment: number } };
  }): Promise<{ count: number }>;
  update(args: {
    where: { id: string };
    data: {
      status: 'PROCESSED' | 'FAILED';
      processedAt?: Date;
      lastError?: string | null;
      availableAt?: Date;
    };
  }): Promise<unknown>;
};

@Injectable()
export class OutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.processPending().catch((error) => this.logger.error('Outbox processing failed', error));
    }, 5000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async enqueue(eventType: string, payload: AuditPayload | NotificationPayload, eventKey = randomUUID()) {
    const outbox = this.getOutboxClient();
    return outbox.createMany({
      data: { eventKey, eventType, payload },
      skipDuplicates: true,
    });
  }

  async processPending(limit = 50) {
    const outbox = this.getOutboxClient();
    const staleProcessingBefore = new Date(Date.now() - 60_000);
    const events = await outbox.findMany({
      where: {
        OR: [
          { status: { in: ['PENDING', 'FAILED'] }, availableAt: { lte: new Date() } },
          { status: 'PROCESSING', updatedAt: { lte: staleProcessingBefore } },
        ],
        attempts: { lt: 10 },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    for (const event of events) {
      const claimed = await outbox.updateMany({
        where: { id: event.id, status: event.status, attempts: event.attempts },
        data: { status: 'PROCESSING', attempts: { increment: 1 } },
      });
      if (claimed.count !== 1) continue;

      try {
        await this.dispatch(event.eventType, event.payload);
        await outbox.update({
          where: { id: event.id },
          data: { status: 'PROCESSED', processedAt: new Date(), lastError: null },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown outbox processing error';
        await outbox.update({
          where: { id: event.id },
          data: {
            status: 'FAILED',
            lastError: message,
            availableAt: new Date(Date.now() + Math.min(60_000, 2 ** event.attempts * 1000)),
          },
        });
        this.logger.error(`Outbox event ${event.eventKey} failed: ${message}`);
      }
    }
  }

  private getOutboxClient(): OutboxClient {
    return (this.prisma as PrismaService & { outboxEvent: OutboxClient }).outboxEvent;
  }

  private async dispatch(eventType: string, payload: unknown) {
    if (eventType === 'AUDIT_LOG') {
      const event = payload as AuditPayload;
      await this.prisma.auditLog.create({ data: event });
      return;
    }
    if (eventType === 'NOTIFICATION_BATCH') {
      const event = payload as NotificationPayload;
      await this.prisma.notification.createMany({
        data: event.userIds.map((userId) => ({
          userId,
          type: event.type as never,
          title: event.title,
          message: event.message,
          metadata: event.metadata as never,
        })),
        skipDuplicates: true,
      });
      return;
    }
    throw new Error(`Unsupported outbox event type: ${eventType}`);
  }
}
