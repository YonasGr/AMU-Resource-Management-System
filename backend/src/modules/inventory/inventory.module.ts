import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { MovementService } from './movement.service';
import { RbacModule } from '../rbac/rbac.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [RbacModule, NotificationModule],
  controllers: [InventoryController],
  providers: [InventoryService, MovementService],
  exports: [InventoryService, MovementService],
})
export class InventoryModule {}
