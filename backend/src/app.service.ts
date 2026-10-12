import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './common/redis/redis.service';

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  getHealth() {
    return {
      status: 'ok',
      service: 'university-erp-backend',
      time: new Date().toISOString(),
    };
  }

  async getReadiness() {
    const checks: Record<string, string> = {};
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'failed';
    }
    checks.redis = this.redis.isRedisConnected() ? 'ok' : 'failed';
    const ready = Object.values(checks).every((status) => status === 'ok');
    return {
      status: ready ? 'ready' : 'not_ready',
      service: 'university-erp-backend',
      checks,
      time: new Date().toISOString(),
    };
  }
}
