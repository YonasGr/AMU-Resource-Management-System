import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateMaterialDto {
  materialCode: string;
  name: string;
  unit: string;
  minimumStock?: number;
  location?: string;
  barcode?: string;
  description?: string;
  categoryId: string;
}

export interface UpdateMaterialDto {
  materialCode?: string;
  name?: string;
  unit?: string;
  minimumStock?: number;
  location?: string;
  barcode?: string;
  description?: string;
  categoryId?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

@Injectable()
export class MaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  async createCategory(name: string, description?: string) {
    const existing = await this.prisma.materialCategory.findUnique({ where: { name } });
    if (existing) {
      throw new ConflictException(`Category "${name}" already exists`);
    }
    return this.prisma.materialCategory.create({
      data: { name, description },
    });
  }

  async findAllCategories() {
    return this.prisma.materialCategory.findMany({
      include: {
        _count: { select: { materials: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateMaterialDto) {
    const existingCode = await this.prisma.material.findUnique({
      where: { materialCode: dto.materialCode },
    });
    if (existingCode) {
      throw new ConflictException(`Material code "${dto.materialCode}" already exists`);
    }

    if (dto.barcode) {
      const existingBarcode = await this.prisma.material.findUnique({
        where: { barcode: dto.barcode },
      });
      if (existingBarcode) {
        throw new ConflictException(`Barcode "${dto.barcode}" is already assigned to another material`);
      }
    }

    const material = await this.prisma.material.create({
      data: {
        materialCode: dto.materialCode,
        name: dto.name,
        unit: dto.unit,
        minimumStock: dto.minimumStock ?? 5,
        location: dto.location,
        barcode: dto.barcode,
        description: dto.description,
        categoryId: dto.categoryId,
        stockSummary: {
          create: {
            quantityReceived: 0,
            quantityIssued: 0,
            remainingQuantity: 0,
          },
        },
      },
      include: {
        category: true,
        stockSummary: true,
      },
    });

    return material;
  }

  async findAll(query?: { search?: string; categoryId?: string; lowStockOnly?: boolean }) {
    const where: any = { status: 'ACTIVE' };

    if (query?.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { materialCode: { contains: query.search, mode: 'insensitive' } },
        { barcode: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const materials = await this.prisma.material.findMany({
      where,
      include: {
        category: true,
        stockSummary: true,
      },
      orderBy: { name: 'asc' },
    });

    if (query?.lowStockOnly) {
      return materials.filter(
        (m) => (m.stockSummary?.remainingQuantity ?? 0) <= m.minimumStock,
      );
    }

    return materials;
  }

  async findOne(id: string) {
    const material = await this.prisma.material.findUnique({
      where: { id },
      include: {
        category: true,
        stockSummary: true,
        transactions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            supplier: true,
            employee: true,
            department: true,
            issuedBy: { select: { fullName: true } },
          },
        },
      },
    });
    if (!material) {
      throw new NotFoundException(`Material with ID ${id} not found`);
    }
    return material;
  }

  async update(id: string, dto: UpdateMaterialDto) {
    const material = await this.prisma.material.findUnique({ where: { id } });
    if (!material) {
      throw new NotFoundException(`Material ${id} not found`);
    }

    return this.prisma.material.update({
      where: { id },
      data: dto,
      include: {
        category: true,
        stockSummary: true,
      },
    });
  }

  async delete(id: string) {
    await this.prisma.material.delete({ where: { id } });
  }
}
