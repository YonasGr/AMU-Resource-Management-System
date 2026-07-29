import { Injectable, NotFoundException } from '@nestjs/common';
import { Item, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CategoryService } from './category.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class ItemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoryService: CategoryService,
  ) {}

  async create(dto: CreateItemDto): Promise<Item> {
    await this.categoryService.findOne(dto.categoryId); // confirms category exists

    return this.prisma.item.create({
      data: {
        name: dto.name,
        description: dto.description,
        unit: dto.unit,
        serialRequired: dto.serialRequired ?? false,
        assetType: dto.assetType ?? 'CONSUMABLE',
        categoryId: dto.categoryId,
      },
    });
  }

  /** search matches item name (case-insensitive, partial) — the "item catalog
   * browser/search" the build plan calls for. */
  async findAll(filter?: { categoryId?: string; status?: string; search?: string }): Promise<Item[]> {
    const where: Prisma.ItemWhereInput = {
      categoryId: filter?.categoryId,
      status: filter?.status as any,
      name: filter?.search ? { contains: filter.search, mode: 'insensitive' } : undefined,
    };

    return this.prisma.item.findMany({
      where,
      include: { category: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string): Promise<Item> {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!item) {
      throw new NotFoundException(`Item ${id} not found`);
    }
    return item;
  }

  async update(id: string, dto: UpdateItemDto): Promise<Item> {
    await this.findOne(id);
    if (dto.categoryId) {
      await this.categoryService.findOne(dto.categoryId);
    }
    return this.prisma.item.update({ where: { id }, data: dto });
  }

  /** Soft-deactivate — an item that's ever appeared in inventory/movements
   * can't be hard-deleted without breaking that history. */
  async deactivate(id: string): Promise<Item> {
    await this.findOne(id);
    return this.prisma.item.update({ where: { id }, data: { status: 'INACTIVE' } });
  }
}
