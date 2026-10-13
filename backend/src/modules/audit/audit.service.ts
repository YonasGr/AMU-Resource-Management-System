import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OutboxService } from '../outbox/outbox.service';
import { AuditQueryDto } from './dto/audit-query.dto';
import {
  AuditAction,
  AuditLogOptions,
  AuditModule,
  createAuditEvent,
} from './audit-event.contract';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService, private readonly outbox: OutboxService) {}

  async log(
    userId: string | null,
    action: AuditAction,
    module: AuditModule,
    details?: string,
    optionsOrIpAddress: AuditLogOptions | string = {},
  ) {
    const options =
      typeof optionsOrIpAddress === 'string'
        ? { ipAddress: optionsOrIpAddress }
        : optionsOrIpAddress;
    await this.outbox.enqueue('AUDIT_LOG', createAuditEvent({
      userId,
      action,
      module,
      details,
      actorRole: options.actorRole,
      storeId: options.storeId,
      deviceId: options.deviceId,
      entityType: options.entityType,
      entityId: options.entityId,
      correlationId: options.correlationId || randomUUID(),
      reversalOfId: options.reversalOfId,
      reason: options.reason,
      source: options.source || 'api',
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      beforeData: options.beforeData,
      afterData: options.afterData,
    }));
    return { queued: true };
  }

  async logInTransaction(
    tx: Prisma.TransactionClient,
    userId: string | null,
    action: AuditAction,
    module: AuditModule,
    details?: string,
    options: AuditLogOptions = {},
  ) {
    const payload = createAuditEvent({
      userId,
      action,
      module,
      details,
      actorRole: options.actorRole,
      storeId: options.storeId,
      deviceId: options.deviceId,
      entityType: options.entityType,
      entityId: options.entityId,
      correlationId: options.correlationId || randomUUID(),
      reversalOfId: options.reversalOfId,
      reason: options.reason,
      source: options.source || 'api',
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      beforeData: options.beforeData,
      afterData: options.afterData,
    });
    const jsonPayload = JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue;

    await tx.outboxEvent.createMany({
      data: [{
        eventKey: payload.correlationId,
        eventType: 'AUDIT_LOG',
        payload: jsonPayload,
      }],
      skipDuplicates: true,
    });
  }

  async findAll(query: AuditQueryDto = new AuditQueryDto()) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 100;
    const where: Prisma.AuditLogWhereInput = {
      action: query.action,
      module: query.module,
      actorRole: query.actorRole,
      storeId: query.storeId,
      deviceId: query.deviceId,
      userId: query.actorId,
      entityType: query.entityType,
      entityId: query.entityId,
      correlationId: query.correlationId,
      OR: query.search
        ? [
            { details: { contains: query.search, mode: 'insensitive' } },
            { reason: { contains: query.search, mode: 'insensitive' } },
          ]
        : undefined,
      createdAt: {
        gte: query.from ? new Date(query.from) : undefined,
        lte: query.to ? new Date(query.to) : undefined,
      },
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { fullName: true, email: true, role: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
