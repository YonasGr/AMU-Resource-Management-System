import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  InventoryService,
} from './inventory.service';
import { StockBalanceService } from './stock-balance.service';
import {
  AdjustmentDto,
  CreateGoodsReceiptDto,
  CreateCycleCountDto,
  InspectGoodsReceiptDto,
  CreateReturnInspectionDto,
  InspectReturnDto,
  ReturnDto,
  StockInDto,
  StockOutDto,
  SubmitCycleCountDto,
  TransferDto,
} from './dto/inventory.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, SafeUser } from '../auth/decorators/current-user.decorator';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly stockBalanceService: StockBalanceService,
  ) {}

  @Post('stock-in')
  @Roles(Role.STOREKEEPER, Role.STORE_MANAGER, Role.ADMINISTRATOR)
  @ApiOperation({ summary: 'Receive Stock / Stock In (Storekeeper / Manager / Admin - UC8)' })
  stockIn(@Req() req: any, @Body() dto: StockInDto) {
    return this.inventoryService.stockIn(req.user, dto);
  }

  @Post('receipts')
  @Roles(Role.STOREKEEPER, Role.STORE_MANAGER, Role.ADMINISTRATOR)
  createGoodsReceipt(@Req() req: any, @Body() dto: CreateGoodsReceiptDto) {
    return this.inventoryService.createGoodsReceipt(req.user, dto);
  }

  @Post('receipts/:id/inspect')
  @Roles(Role.STORE_MANAGER, Role.ADMINISTRATOR)
  inspectGoodsReceipt(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InspectGoodsReceiptDto,
  ) {
    return this.inventoryService.inspectGoodsReceipt(id, req.user, dto);
  }

  @Post('receipts/:id/post')
  @Roles(Role.STORE_MANAGER, Role.ADMINISTRATOR)
  postGoodsReceipt(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.postGoodsReceipt(id, req.user);
  }

  @Post('cycle-counts')
  @Roles(Role.STOREKEEPER, Role.STORE_MANAGER, Role.ADMINISTRATOR)
  createCycleCount(@Req() req: any, @Body() dto: CreateCycleCountDto) {
    return this.inventoryService.createCycleCount(req.user, dto);
  }

  @Post('cycle-counts/:id/submit')
  @Roles(Role.STOREKEEPER, Role.STORE_MANAGER, Role.ADMINISTRATOR)
  submitCycleCount(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitCycleCountDto,
  ) {
    return this.inventoryService.submitCycleCount(id, req.user, dto);
  }

  @Post('cycle-counts/:id/recount')
  @Roles(Role.STORE_MANAGER, Role.ADMINISTRATOR)
  requestCycleCountRecount(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.requestCycleCountRecount(id, req.user);
  }

  @Post('cycle-counts/:id/approve')
  @Roles(Role.STORE_MANAGER, Role.ADMINISTRATOR)
  approveCycleCount(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.approveCycleCount(id, req.user);
  }

  @Post('stock-out')
  @Roles(Role.STOREKEEPER, Role.STORE_MANAGER, Role.ADMINISTRATOR)
  @ApiOperation({ summary: 'Issue Materials / Stock Out Direct (Storekeeper / Manager / Admin - UC9)' })
  stockOut(@Req() req: any, @Body() dto: StockOutDto) {
    return this.inventoryService.stockOut(req.user, dto);
  }

  @Post('return')
  @Roles(Role.STOREKEEPER, Role.STORE_MANAGER, Role.ADMINISTRATOR)
  @ApiOperation({ summary: 'Return materials against an issued request item (Storekeeper / Manager / Admin - UC10)' })
  returnMaterial(@Req() req: any, @Body() dto: ReturnDto) {
    return this.inventoryService.returnMaterial(req.user, dto);
  }

  @Post('adjustment')
  @Roles(Role.STORE_MANAGER, Role.ADMINISTRATOR)
  @ApiOperation({ summary: 'Stock Adjustment Audit (Store Manager / Admin - UC11)' })
  adjustStock(@Req() req: any, @Body() dto: AdjustmentDto) {
    return this.inventoryService.adjustStock(req.user, dto);
  }

  @Post('transfer')
  @Roles(Role.STOREKEEPER, Role.STORE_MANAGER, Role.ADMINISTRATOR)
  @ApiOperation({ summary: 'Transfer Materials (Storekeeper / Manager / Admin - UC12)' })
  transferMaterial(@Req() req: any, @Body() dto: TransferDto) {
    return this.inventoryService.transferMaterial(req.user, dto);
  }

  @Post('transfer/:id/dispatch')
  @Roles(Role.STOREKEEPER, Role.STORE_MANAGER, Role.ADMINISTRATOR)
  dispatchTransfer(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.dispatchTransfer(id, req.user);
  }

  @Post('transfer/:id/receive')
  @Roles(Role.STOREKEEPER, Role.STORE_MANAGER, Role.ADMINISTRATOR)
  receiveTransfer(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.receiveTransfer(id, req.user);
  }

  @Post('return-inspections')
  @Roles(Role.STOREKEEPER, Role.STORE_MANAGER, Role.ADMINISTRATOR)
  createReturnInspection(@Req() req: any, @Body() dto: CreateReturnInspectionDto) {
    return this.inventoryService.createReturnInspection(req.user, dto);
  }

  @Post('return-inspections/:id/inspect')
  @Roles(Role.STORE_MANAGER, Role.ADMINISTRATOR)
  inspectReturn(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: InspectReturnDto) {
    return this.inventoryService.inspectReturn(id, req.user, dto);
  }

  @Post('return-inspections/:id/post')
  @Roles(Role.STORE_MANAGER, Role.ADMINISTRATOR)
  postReturnInspection(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.postReturnInspection(id, req.user);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'View Transaction History Ledger (UC16)' })
  findAllTransactions(
    @CurrentUser() user: SafeUser,
    @Query('type') type?: string,
    @Query('materialId') materialId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('supplierId') supplierId?: string,
  ) {
    return this.inventoryService.findAllTransactions(user, {
      type: type as any,
      materialId,
      departmentId,
      employeeId,
      supplierId,
    });
  }

  @Get('reconciliation/stock-summaries')
  @Roles(Role.ADMINISTRATOR, Role.AUDITOR)
  @ApiOperation({ summary: 'Find aggregate stock summaries that diverge from store balances' })
  findStockSummaryMismatches() {
    return this.stockBalanceService.findSummaryMismatches();
  }
}
