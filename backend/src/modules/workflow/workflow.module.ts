import { Module } from '@nestjs/common';
import { WorkflowController } from './workflow.controller';
import { WorkflowEngineService } from './workflow-engine.service';
import { RbacModule } from '../rbac/rbac.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [RbacModule, NotificationModule],
  controllers: [WorkflowController],
  providers: [WorkflowEngineService],
  exports: [WorkflowEngineService],
})
export class WorkflowModule {}
