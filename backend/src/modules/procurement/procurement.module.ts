import { Module } from '@nestjs/common';
import { ProcurementController } from './procurement.controller';
import { PurchaseOrderService } from './purchase-order.service';
import { SupplierService } from './supplier.service';
import { GoodsReceiptService } from './goods-receipt.service';
import { InventoryModule } from '../inventory/inventory.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [InventoryModule, NotificationModule],
  controllers: [ProcurementController],
  providers: [SupplierService, PurchaseOrderService, GoodsReceiptService],
  exports: [SupplierService, PurchaseOrderService, GoodsReceiptService],
})
export class ProcurementModule {}
