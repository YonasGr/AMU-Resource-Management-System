import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { StoreService } from './store.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { AssignManagerDto } from './dto/assign-manager.dto';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { CurrentUser, SafeUser } from '../auth/decorators/current-user.decorator';

@ApiTags('stores')
@ApiBearerAuth()
@Controller('stores')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Post()
  @RequirePermission('store.manage')
  @ApiOperation({ summary: 'Create a new store under an organization unit' })
  create(@Body() dto: CreateStoreDto, @CurrentUser() user: SafeUser) {
    return this.storeService.create(dto, user);
  }

  @Get()
  @RequirePermission('store.view')
  @ApiOperation({ summary: 'List stores visible to the current user (scoped by role assignment)' })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Filter by organization unit id' })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE'] })
  findAll(
    @CurrentUser() user: SafeUser,
    @Query('organizationId') organizationId?: string,
    @Query('status') status?: string,
  ) {
    return this.storeService.findAll(user, { organizationId, status });
  }

  @Get(':id')
  @RequirePermission('store.view')
  @ApiOperation({ summary: 'Get a single store by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: SafeUser) {
    return this.storeService.findOne(id, user);
  }

  @Patch(':id')
  @RequirePermission('store.manage')
  @ApiOperation({ summary: 'Update a store (rename, relocate, change status)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStoreDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.storeService.update(id, dto, user);
  }

  @Post(':id/manager')
  @RequirePermission('store.manage')
  @ApiOperation({ summary: 'Assign (or reassign) the manager of a store' })
  assignManager(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignManagerDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.storeService.assignManager(id, dto.managerId, user);
  }

  @Delete(':id')
  @RequirePermission('store.manage')
  @ApiOperation({ summary: 'Deactivate a store (soft delete)' })
  deactivate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: SafeUser) {
    return this.storeService.deactivate(id, user);
  }
}
