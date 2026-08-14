import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateSupplierDto {
  supplierCode: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
}

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSupplierDto) {
    const existing = await this.prisma.supplier.findUnique({
      where: { supplierCode: dto.supplierCode },
    });
    if (existing) {
      throw new ConflictException(`Supplier code "${dto.supplierCode}" already exists`);
    }

    return this.prisma.supplier.create({ data: dto });
  }

  async findAll() {
    return this.prisma.supplier.findMany({
      include: {
        _count: { select: { transactions: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        transactions: {
          include: {
            material: true,
            issuedBy: { select: { fullName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!supplier) {
      throw new NotFoundException(`Supplier ${id} not found`);
    }
    return supplier;
  }

  async update(id: string, dto: Partial<CreateSupplierDto>) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) {
      throw new NotFoundException(`Supplier ${id} not found`);
    }

    return this.prisma.supplier.update({
      where: { id },
      data: dto,
    });
  }
}
