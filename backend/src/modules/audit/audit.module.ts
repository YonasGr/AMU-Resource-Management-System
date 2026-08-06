import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AuditController],
  providers: [AuditService],
  // Exported so other modules (Auth, Rbac, Store, etc.) can inject it
  exports: [AuditService],
})
export class AuditModule {}
