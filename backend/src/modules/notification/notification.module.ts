import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationController],
  providers: [NotificationService],
  // Exported so other modules (WorkflowModule, RequestModule, etc.) can inject it
  exports: [NotificationService],
})
export class NotificationModule {}
