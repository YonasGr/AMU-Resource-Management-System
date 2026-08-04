import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser, SafeUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { PurchaseOrderService } from './purchase-order.service';
import { SupplierService } from './supplier.service';
import { GoodsReceiptService } from './goods-receipt.service';
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';

@ApiTags('procurement')
@ApiBearerAuth()
@Controller('procurement')
export class ProcurementController {
  constructor(
    private readonly suppliers: SupplierService,
    private readonly orders: PurchaseOrderService,
    private readonly receipts: GoodsReceiptService,
  ) {}

  @Post('suppliers') @RequirePermission('supplier.manage')
  @ApiOperation({ summary: 'Create a supplier' })
  createSupplier(@Body() dto: CreateSupplierDto) { return this.suppliers.create(dto); }

  @Get('suppliers') @RequirePermission('purchase.view')
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  listSuppliers(@Query('includeInactive') includeInactive?: string) {
    return this.suppliers.findAll(includeInactive === 'true');
  }

  @Get('suppliers/:id') @RequirePermission('purchase.view')
  getSupplier(@Param('id', ParseUUIDPipe) id: string) { return this.suppliers.findOne(id); }

  @Patch('suppliers/:id') @RequirePermission('supplier.manage')
  updateSupplier(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliers.update(id, dto);
  }

  @Delete('suppliers/:id') @RequirePermission('supplier.manage')
  deactivateSupplier(@Param('id', ParseUUIDPipe) id: string) { return this.suppliers.deactivate(id); }

  @Post('purchase-orders') @RequirePermission('purchase.manage')
  @ApiOperation({ summary: 'Create a purchase order against an approved purchase request' })
  createOrder(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() user: SafeUser) {
    return this.orders.create(dto, user);
  }

  @Get('purchase-orders') @RequirePermission('purchase.view')
  listOrders() { return this.orders.findAll(); }

  @Get('purchase-orders/:id') @RequirePermission('purchase.view')
  getOrder(@Param('id', ParseUUIDPipe) id: string) { return this.orders.findOne(id); }

  @Post('purchase-orders/:id/issue') @RequirePermission('purchase.manage')
  issueOrder(@Param('id', ParseUUIDPipe) id: string) { return this.orders.issue(id); }

  @Post('purchase-orders/:id/cancel') @RequirePermission('purchase.manage')
  cancelOrder(@Param('id', ParseUUIDPipe) id: string) { return this.orders.cancel(id); }

  @Post('purchase-orders/:id/receipts') @RequirePermission('purchase.receive')
  @ApiOperation({ summary: 'Record a partial or final goods receipt into the order destination store' })
  receiveOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateGoodsReceiptDto,
    @CurrentUser() user: SafeUser,
  ) { return this.receipts.create(id, dto, user); }

  @Get('goods-receipts') @RequirePermission('purchase.view')
  @ApiQuery({ name: 'purchaseOrderId', required: false })
  listReceipts(@Query('purchaseOrderId') purchaseOrderId?: string) {
    return this.receipts.findAll(purchaseOrderId);
  }
}
