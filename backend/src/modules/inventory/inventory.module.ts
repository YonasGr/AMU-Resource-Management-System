import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { MovementService } from './movement.service';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [RbacModule],
  controllers: [InventoryController],
  providers: [InventoryService, MovementService],
  exports: [InventoryService, MovementService],
})
export class InventoryModule {}
