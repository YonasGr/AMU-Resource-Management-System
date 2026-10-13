import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OutboxService } from '../outbox/outbox.service';
import { AuditQueryDto } from './dto/audit-query.dto';

export interface AuditLogOptions {
  actorRole?: string;
  entityType?: string;
  entityId?: string;
  correlationId?: string;
  reason?: string;
  source?: string;
  ipAddress?: string;
  userAgent?: string;
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService, private readonly outbox: OutboxService) {}

  async log(
    userId: string | null,
    action: string,
    module: string,
    details?: string,
    optionsOrIpAddress: AuditLogOptions | string = {},
  ) {
    const options =
      typeof optionsOrIpAddress === 'string'
        ? { ipAddress: optionsOrIpAddress }
        : optionsOrIpAddress;
    await this.outbox.enqueue('AUDIT_LOG', {
      userId,
      action,
      module,
      details,
      actorRole: options.actorRole,
      entityType: options.entityType,
      entityId: options.entityId,
      correlationId: options.correlationId || randomUUID(),
      reason: options.reason,
      source: options.source || 'api',
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      beforeData: options.beforeData,
      afterData: options.afterData,
    });
    return { queued: true };
  }

  async logInTransaction(
    tx: Prisma.TransactionClient,
    userId: string | null,
    action: string,
    module: string,
    details?: string,
    options: AuditLogOptions = {},
  ) {
    const payload = {
      userId,
      action,
      module,
      details,
      actorRole: options.actorRole,
      entityType: options.entityType,
      entityId: options.entityId,
      correlationId: options.correlationId || randomUUID(),
      reason: options.reason,
      source: options.source || 'api',
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      beforeData: options.beforeData,
      afterData: options.afterData,
    };
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
