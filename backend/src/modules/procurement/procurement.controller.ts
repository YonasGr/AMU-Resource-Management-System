import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, SafeUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreatePurchaseOrderDto } from './dto/purchase-order.dto';
import { ProcurementService } from './procurement.service';

@ApiTags('procurement')
@ApiBearerAuth()
@Controller('purchase-orders')
export class ProcurementController {
  constructor(private readonly procurement: ProcurementService) {}

  @Post()
  @Roles(Role.STORE_MANAGER)
  create(@CurrentUser() user: SafeUser, @Body() dto: CreatePurchaseOrderDto) {
    return this.procurement.create(user, dto);
  }

  @Get()
  findAll(@CurrentUser() user: SafeUser) {
    return this.procurement.findAll(user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: SafeUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.procurement.findOne(user, id);
  }

  @Post(':id/submit')
  @Roles(Role.STORE_MANAGER)
  submit(@CurrentUser() user: SafeUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.procurement.submit(user, id);
  }

  @Post(':id/approve')
  @Roles(Role.STORE_MANAGER)
  approve(@CurrentUser() user: SafeUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.procurement.approve(user, id);
  }

  @Post(':id/reject')
  @Roles(Role.STORE_MANAGER)
  reject(@CurrentUser() user: SafeUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.procurement.reject(user, id);
  }

  @Post(':id/cancel')
  @Roles(Role.STORE_MANAGER)
  cancel(@CurrentUser() user: SafeUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.procurement.cancel(user, id);
  }
}
