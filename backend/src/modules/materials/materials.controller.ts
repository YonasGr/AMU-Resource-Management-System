import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MaterialsService, CreateMaterialDto, UpdateMaterialDto } from './materials.service';

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
  @ApiOperation({ summary: 'Create a new material category' })
  createCategory(@Body() body: { name: string; description?: string }) {
    return this.materialsService.createCategory(body.name, body.description);
  }

  @Post()
  @ApiOperation({ summary: 'Register a new store material' })
  create(@Body() dto: CreateMaterialDto) {
    return this.materialsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List and filter materials' })
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
  @ApiOperation({ summary: 'Update material details' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMaterialDto) {
    return this.materialsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete material' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.materialsService.delete(id);
    return { success: true };
  }
}
