import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { RbacModule } from '../rbac/rbac.module';
import { AssetController } from './asset.controller';
import { AssetService } from './asset.service';
import { BorrowService } from './borrow.service';
import { DisposalService } from './disposal.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [InventoryModule, RbacModule, NotificationModule],
  controllers: [AssetController],
  providers: [AssetService, BorrowService, DisposalService],
  exports: [AssetService, BorrowService, DisposalService],
})
export class AssetModule {}
