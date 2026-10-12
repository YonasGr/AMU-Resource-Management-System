import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OutboxService } from '../outbox/outbox.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService, private readonly outbox: OutboxService) {}

  async log(userId: string | null, action: string, module: string, details?: string, ipAddress?: string) {
    await this.outbox.enqueue('AUDIT_LOG', { userId, action, module, details, ipAddress });
    return { queued: true };
  }

  async findAll() {
    return this.prisma.auditLog.findMany({
      include: {
        user: { select: { fullName: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
