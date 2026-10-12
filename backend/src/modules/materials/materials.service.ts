import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMaterialDto, UpdateMaterialDto } from './dto/material.dto';

@Injectable()
export class MaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  private aggregateBalances<T extends { quantityReceived: number; quantityIssued: number; remainingQuantity: number }>(
    balances: T[],
  ) {
    return balances.reduce(
      (summary, balance) => ({
        quantityReceived: summary.quantityReceived + balance.quantityReceived,
        quantityIssued: summary.quantityIssued + balance.quantityIssued,
        remainingQuantity: summary.remainingQuantity + balance.remainingQuantity,
      }),
      { quantityReceived: 0, quantityIssued: 0, remainingQuantity: 0 },
    );
  }

  async createCategory(name: string, description?: string) {
    const existing = await this.prisma.materialCategory.findUnique({ where: { name } });
    if (existing) {
      throw new ConflictException(`Category "${name}" already exists`);
    }
    return this.prisma.materialCategory.create({ data: { name, description } });
  }

  async findAllCategories() {
    return this.prisma.materialCategory.findMany({
      include: { _count: { select: { materials: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateMaterialDto) {
    const existingCode = await this.prisma.material.findUnique({ where: { materialCode: dto.materialCode } });
    if (existingCode) {
      throw new ConflictException(`Material code "${dto.materialCode}" already exists`);
    }

    if (dto.barcode) {
      const existingBarcode = await this.prisma.material.findUnique({ where: { barcode: dto.barcode } });
      if (existingBarcode) {
        throw new ConflictException(`Barcode "${dto.barcode}" is already assigned to another material`);
      }
    }

    return this.prisma.material.create({
      data: {
        materialCode: dto.materialCode,
        name: dto.name,
        unit: dto.unit.trim(),
        unitCategory: dto.unitCategory,
        baseUnit: dto.baseUnit,
        conversionFactorToBase: dto.conversionFactorToBase,
        allowsFractional: dto.allowsFractional,
        minimumStock: dto.minimumStock ?? 5,
        location: dto.location,
        barcode: dto.barcode,
        description: dto.description,
        categoryId: dto.categoryId,
        stockSummary: {
          create: { quantityReceived: 0, quantityIssued: 0, remainingQuantity: 0 },
        },
      },
      include: { category: true, stockSummary: true },
    });
  }

  async findAll(query?: { search?: string; categoryId?: string; lowStockOnly?: boolean }) {
    const where: any = { status: 'ACTIVE' };
    if (query?.categoryId) where.categoryId = query.categoryId;
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { materialCode: { contains: query.search, mode: 'insensitive' } },
        { barcode: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const materials = await this.prisma.material.findMany({
      where,
      include: { category: true, stockBalances: true },
      orderBy: { name: 'asc' },
    });
    const withAggregateBalances = materials.map(({ stockBalances, ...material }) => ({
      ...material,
      stockSummary: this.aggregateBalances(stockBalances),
    }));

    return query?.lowStockOnly
      ? withAggregateBalances.filter((m) => m.stockSummary.remainingQuantity <= m.minimumStock)
      : withAggregateBalances;
  }

  async findOne(id: string) {
    const material = await this.prisma.material.findUnique({
      where: { id },
      include: {
        category: true,
        stockBalances: true,
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
    if (!material) throw new NotFoundException(`Material with ID ${id} not found`);
    const { stockBalances, ...materialWithoutBalances } = material;
    return { ...materialWithoutBalances, stockSummary: this.aggregateBalances(stockBalances) };
  }

  async update(id: string, dto: UpdateMaterialDto) {
    const material = await this.prisma.material.findUnique({ where: { id } });
    if (!material) throw new NotFoundException(`Material ${id} not found`);

    const updated = await this.prisma.material.update({
      where: { id },
      data: { ...dto, ...(dto.unit ? { unit: dto.unit.trim() } : {}) },
      include: { category: true, stockBalances: true },
    });
    const { stockBalances, ...materialWithoutBalances } = updated;
    return { ...materialWithoutBalances, stockSummary: this.aggregateBalances(stockBalances) };
  }

  async delete(id: string) {
    await this.prisma.material.delete({ where: { id } });
  }
}
