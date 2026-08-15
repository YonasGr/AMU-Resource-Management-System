import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  InventoryService,
  StockInDto,
  StockOutDto,
  ReturnDto,
  AdjustmentDto,
  TransferDto,
} from './inventory.service';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('stock-in')
  @Roles(Role.STOREKEEPER)
  @ApiOperation({ summary: 'Receive Stock / Stock In (Storekeeper only - UC8)' })
  stockIn(@Req() req: any, @Body() dto: StockInDto) {
    return this.inventoryService.stockIn(req.user.id, dto);
  }

  @Post('stock-out')
  @Roles(Role.STOREKEEPER)
  @ApiOperation({ summary: 'Issue Materials / Stock Out Direct (Storekeeper only - UC9)' })
  stockOut(@Req() req: any, @Body() dto: StockOutDto) {
    return this.inventoryService.stockOut(req.user.id, dto);
  }

  @Post('return')
  @Roles(Role.STOREKEEPER)
  @ApiOperation({ summary: 'Return Materials (Storekeeper only - UC10)' })
  returnMaterial(@Req() req: any, @Body() dto: ReturnDto) {
    return this.inventoryService.returnMaterial(req.user.id, dto);
  }

  @Post('adjustment')
  @Roles(Role.STOREKEEPER)
  @ApiOperation({ summary: 'Stock Adjustment Audit (Storekeeper only - UC11)' })
  adjustStock(@Req() req: any, @Body() dto: AdjustmentDto) {
    return this.inventoryService.adjustStock(req.user.id, dto);
  }

  @Post('transfer')
  @Roles(Role.STOREKEEPER)
  @ApiOperation({ summary: 'Transfer Materials (Storekeeper only - UC12)' })
  transferMaterial(@Req() req: any, @Body() dto: TransferDto) {
    return this.inventoryService.transferMaterial(req.user.id, dto);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'View Transaction History Ledger (UC16)' })
  findAllTransactions(
    @Query('type') type?: string,
    @Query('materialId') materialId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('supplierId') supplierId?: string,
  ) {
    return this.inventoryService.findAllTransactions({
      type: type as any,
      materialId,
      departmentId,
      employeeId,
      supplierId,
    });
  }
}
