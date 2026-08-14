import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InventoryService, StockInDto, StockOutDto, ReturnDto, AdjustmentDto } from './inventory.service';
import { CurrentUser, SafeUser } from '../auth/decorators/current-user.decorator';
import { TransactionType } from '@prisma/client';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('stock-in')
  @ApiOperation({ summary: 'Receive materials (Stock In from Supplier)' })
  stockIn(@CurrentUser() user: SafeUser, @Body() dto: StockInDto) {
    return this.inventoryService.stockIn(user.id, dto);
  }

  @Post('stock-out')
  @ApiOperation({ summary: 'Issue materials (Direct Stock Out)' })
  stockOut(@CurrentUser() user: SafeUser, @Body() dto: StockOutDto) {
    return this.inventoryService.stockOut(user.id, dto);
  }

  @Post('return')
  @ApiOperation({ summary: 'Return materials to store' })
  returnMaterial(@CurrentUser() user: SafeUser, @Body() dto: ReturnDto) {
    return this.inventoryService.returnMaterial(user.id, dto);
  }

  @Post('adjustment')
  @ApiOperation({ summary: 'Adjust stock balance manually (Audit Adjustment)' })
  adjustStock(@CurrentUser() user: SafeUser, @Body() dto: AdjustmentDto) {
    return this.inventoryService.adjustStock(user.id, dto);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'View all inventory transactions' })
  findAllTransactions(
    @Query('type') type?: TransactionType,
    @Query('materialId') materialId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('supplierId') supplierId?: string,
  ) {
    return this.inventoryService.findAllTransactions({
      type,
      materialId,
      departmentId,
      employeeId,
      supplierId,
    });
  }
}
