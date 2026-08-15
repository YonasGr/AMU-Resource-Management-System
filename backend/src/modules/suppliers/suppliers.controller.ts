import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SuppliersService, CreateSupplierDto } from './suppliers.service';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('suppliers')
@ApiBearerAuth()
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @Roles(Role.ADMINISTRATOR, Role.STORE_MANAGER)
  @ApiOperation({ summary: 'Register a new supplier (Admin & Store Manager - UC7)' })
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all suppliers' })
  findAll() {
    return this.suppliersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier details' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliersService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMINISTRATOR, Role.STORE_MANAGER)
  @ApiOperation({ summary: 'Update supplier details (Admin & Store Manager)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<CreateSupplierDto>) {
    return this.suppliersService.update(id, dto);
  }
}
