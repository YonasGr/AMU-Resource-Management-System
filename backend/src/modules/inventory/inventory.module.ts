import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { StockBalanceService } from './stock-balance.service';

@Module({
  imports: [NotificationsModule, AuthModule],
  controllers: [InventoryController],
  providers: [InventoryService, StockBalanceService],
  exports: [InventoryService, StockBalanceService],
})
export class InventoryModule {}
