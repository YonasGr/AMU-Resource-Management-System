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
import { CategoryService } from './category.service';
import { ItemService } from './item.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';

@ApiTags('item-catalog')
@ApiBearerAuth()
@Controller()
export class ItemCatalogController {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly itemService: ItemService,
  ) {}

  @Post('item-categories')
  @RequirePermission('item.manage')
  @ApiOperation({ summary: 'Create an item category' })
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Get('item-categories')
  @RequirePermission('item.view')
  @ApiOperation({ summary: 'List all item categories' })
  listCategories() {
    return this.categoryService.findAll();
  }

  @Patch('item-categories/:id')
  @RequirePermission('item.manage')
  @ApiOperation({ summary: 'Update an item category' })
  updateCategory(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.update(id, dto);
  }

  @Delete('item-categories/:id')
  @RequirePermission('item.manage')
  @ApiOperation({ summary: 'Delete an empty item category' })
  async deleteCategory(@Param('id', ParseUUIDPipe) id: string) {
    await this.categoryService.delete(id);
    return { success: true };
  }

  @Post('items')
  @RequirePermission('item.manage')
  @ApiOperation({ summary: 'Create a catalog item' })
  createItem(@Body() dto: CreateItemDto) {
    return this.itemService.create(dto);
  }

  @Get('items')
  @RequirePermission('item.view')
  @ApiOperation({ summary: 'Browse/search the item catalog' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE'] })
  @ApiQuery({ name: 'search', required: false, description: 'Case-insensitive partial name match' })
  listItems(
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.itemService.findAll({ categoryId, status, search });
  }

  @Get('items/:id')
  @RequirePermission('item.view')
  @ApiOperation({ summary: 'Get a single catalog item' })
  getItem(@Param('id', ParseUUIDPipe) id: string) {
    return this.itemService.findOne(id);
  }

  @Patch('items/:id')
  @RequirePermission('item.manage')
  @ApiOperation({ summary: 'Update a catalog item' })
  updateItem(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateItemDto) {
    return this.itemService.update(id, dto);
  }

  @Delete('items/:id')
  @RequirePermission('item.manage')
  @ApiOperation({ summary: 'Deactivate a catalog item (soft delete)' })
  async deactivateItem(@Param('id', ParseUUIDPipe) id: string) {
    await this.itemService.deactivate(id);
    return { success: true };
  }
}
