import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { RbacModule } from '../rbac/rbac.module';
import { DistributionController } from './distribution.controller';
import { DistributionService } from './distribution.service';

@Module({
  imports: [InventoryModule, RbacModule],
  controllers: [DistributionController],
  providers: [DistributionService],
  exports: [DistributionService],
})
export class DistributionModule {}
