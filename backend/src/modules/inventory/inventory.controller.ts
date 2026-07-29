import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { MovementService } from './movement.service';
import { ReceiveStockDto } from './dto/receive-stock.dto';
import { IssueStockDto } from './dto/issue-stock.dto';
import { ReturnStockDto } from './dto/return-stock.dto';
import { DisposeStockDto } from './dto/dispose-stock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { TransferStockDto } from './dto/transfer-stock.dto';
import { SetMinimumStockDto } from './dto/set-minimum-stock.dto';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { CurrentUser, SafeUser } from '../auth/decorators/current-user.decorator';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller()
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly movementService: MovementService,
  ) {}

  @Get('inventory/stores/:storeId')
  @RequirePermission('inventory.view')
  @ApiOperation({ summary: 'List all item quantities at a store' })
  getByStore(@Param('storeId', ParseUUIDPipe) storeId: string, @CurrentUser() user: SafeUser) {
    return this.inventoryService.getByStore(storeId, user);
  }

  @Get('inventory/items/:itemId')
  @RequirePermission('inventory.view')
  @ApiOperation({ summary: 'List quantities of one item across all stores the user can see' })
  getByItem(@Param('itemId', ParseUUIDPipe) itemId: string, @CurrentUser() user: SafeUser) {
    return this.inventoryService.getByItem(itemId, user);
  }

  @Get('inventory/low-stock')
  @RequirePermission('inventory.view')
  @ApiOperation({ summary: 'List store-items at or below their minimum stock threshold' })
  @ApiQuery({ name: 'storeId', required: false })
  getLowStock(@CurrentUser() user: SafeUser, @Query('storeId') storeId?: string) {
    return this.inventoryService.getLowStock(user, storeId);
  }

  @Patch('inventory/stores/:storeId/items/:itemId/minimum-stock')
  @RequirePermission('inventory.adjust')
  @ApiOperation({ summary: 'Set the reorder threshold for an item at a store' })
  setMinimumStock(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: SetMinimumStockDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.inventoryService.setMinimumStock(storeId, itemId, dto, user);
  }

  @Get('inventory/movements')
  @RequirePermission('inventory.view')
  @ApiOperation({ summary: 'Movement history, scoped to stores the user can see' })
  @ApiQuery({ name: 'storeId', required: false })
  @ApiQuery({ name: 'itemId', required: false })
  getMovementHistory(
    @CurrentUser() user: SafeUser,
    @Query('storeId') storeId?: string,
    @Query('itemId') itemId?: string,
  ) {
    return this.movementService.getMovementHistory(user, { storeId, itemId });
  }

  @Post('inventory/movements/receive')
  @RequirePermission('inventory.receive')
  @ApiOperation({ summary: 'Record stock received into a store (e.g. from a purchase)' })
  receive(@Body() dto: ReceiveStockDto, @CurrentUser() user: SafeUser) {
    return this.movementService.applyMovement({
      itemId: dto.itemId,
      storeId: dto.storeId,
      quantity: dto.quantity,
      movementType: 'PURCHASE_RECEIVE',
      referenceId: dto.referenceId,
      currentUser: user,
    });
  }

  @Post('inventory/movements/issue')
  @RequirePermission('inventory.issue')
  @ApiOperation({ summary: 'Record stock issued out of a store' })
  issue(@Body() dto: IssueStockDto, @CurrentUser() user: SafeUser) {
    return this.movementService.applyMovement({
      itemId: dto.itemId,
      storeId: dto.storeId,
      quantity: dto.quantity,
      movementType: 'ISSUE',
      referenceId: dto.referenceId,
      currentUser: user,
    });
  }

  @Post('inventory/movements/return')
  @RequirePermission('inventory.receive')
  @ApiOperation({ summary: 'Record stock returned back into a store' })
  returnStock(@Body() dto: ReturnStockDto, @CurrentUser() user: SafeUser) {
    return this.movementService.applyMovement({
      itemId: dto.itemId,
      storeId: dto.storeId,
      quantity: dto.quantity,
      movementType: 'RETURN',
      referenceId: dto.referenceId,
      currentUser: user,
    });
  }

  @Post('inventory/movements/dispose')
  @RequirePermission('disposal.approve')
  @ApiOperation({ summary: 'Record stock removed via disposal' })
  dispose(@Body() dto: DisposeStockDto, @CurrentUser() user: SafeUser) {
    return this.movementService.applyMovement({
      itemId: dto.itemId,
      storeId: dto.storeId,
      quantity: dto.quantity,
      movementType: 'DISPOSAL',
      referenceId: dto.referenceId,
      currentUser: user,
    });
  }

  @Post('inventory/movements/adjust')
  @RequirePermission('inventory.adjust')
  @ApiOperation({ summary: 'Manually correct stock (signed quantity: +/-)' })
  adjust(@Body() dto: AdjustStockDto, @CurrentUser() user: SafeUser) {
    return this.movementService.applyMovement({
      itemId: dto.itemId,
      storeId: dto.storeId,
      quantity: dto.quantity,
      movementType: 'ADJUSTMENT',
      referenceId: dto.referenceId,
      currentUser: user,
    });
  }

  @Post('inventory/movements/transfer')
  @RequirePermission('transfer.approve')
  @ApiOperation({ summary: 'Transfer stock between two stores (writes a paired OUT+IN movement)' })
  transfer(@Body() dto: TransferStockDto, @CurrentUser() user: SafeUser) {
    return this.movementService.applyTransfer({
      itemId: dto.itemId,
      fromStoreId: dto.fromStoreId,
      toStoreId: dto.toStoreId,
      quantity: dto.quantity,
      referenceId: dto.referenceId,
      currentUser: user,
    });
  }
}
