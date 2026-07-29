import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ItemCategory, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto): Promise<ItemCategory> {
    try {
      return await this.prisma.itemCategory.create({ data: dto });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(`A category named "${dto.name}" already exists`);
      }
      throw err;
    }
  }

  async findAll(): Promise<ItemCategory[]> {
    return this.prisma.itemCategory.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string): Promise<ItemCategory> {
    const category = await this.prisma.itemCategory.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Item category ${id} not found`);
    }
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<ItemCategory> {
    await this.findOne(id);
    try {
      return await this.prisma.itemCategory.update({ where: { id }, data: dto });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(`A category named "${dto.name}" already exists`);
      }
      throw err;
    }
  }

  /** Hard delete is fine here — categories only exist to organize items, and
   * are only removable while empty; items themselves are never hard-deleted. */
  async delete(id: string): Promise<void> {
    await this.findOne(id);
    const itemCount = await this.prisma.item.count({ where: { categoryId: id } });
    if (itemCount > 0) {
      throw new BadRequestException(
        `Cannot delete category with ${itemCount} item(s) still assigned to it`,
      );
    }
    await this.prisma.itemCategory.delete({ where: { id } });
  }
}
