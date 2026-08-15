import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { MaterialsService, CreateMaterialDto, UpdateMaterialDto } from './materials.service';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('materials')
@ApiBearerAuth()
@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get('categories')
  @ApiOperation({ summary: 'List all material categories' })
  getCategories() {
    return this.materialsService.findAllCategories();
  }

  @Post('categories')
  @Roles(Role.ADMINISTRATOR)
  @ApiOperation({ summary: 'Create a new material category (Administrator only - UC5)' })
  createCategory(@Body() body: { name: string; description?: string }) {
    return this.materialsService.createCategory(body.name, body.description);
  }

  @Post()
  @Roles(Role.ADMINISTRATOR)
  @ApiOperation({ summary: 'Register a new store material (Administrator only - UC6 Item Master)' })
  create(@Body() dto: CreateMaterialDto) {
    return this.materialsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List and filter materials (Real-time Stock Balances - UC14)' })
  findAll(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('lowStockOnly') lowStockOnly?: string,
  ) {
    return this.materialsService.findAll({
      search,
      categoryId,
      lowStockOnly: lowStockOnly === 'true',
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get material details and transaction history' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.materialsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMINISTRATOR)
  @ApiOperation({ summary: 'Update material details (Administrator only)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMaterialDto) {
    return this.materialsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMINISTRATOR)
  @ApiOperation({ summary: 'Delete material (Administrator only)' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.materialsService.delete(id);
    return { success: true };
  }
}
