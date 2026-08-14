import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(userId: string | null, action: string, module: string, details?: string, ipAddress?: string) {
    return this.prisma.auditLog.create({
      data: {
        userId,
        action,
        module,
        details,
        ipAddress,
      },
    });
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
