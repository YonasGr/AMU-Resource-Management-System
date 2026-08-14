import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 1. Current Stock Report */
  async getCurrentStockReport() {
    return this.prisma.material.findMany({
      select: {
        materialCode: true,
        name: true,
        unit: true,
        location: true,
        minimumStock: true,
        category: { select: { name: true } },
        stockSummary: {
          select: {
            quantityReceived: true,
            quantityIssued: true,
            remainingQuantity: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /** 2. Stock In Report */
  async getStockInReport() {
    return this.prisma.inventoryTransaction.findMany({
      where: { type: 'STOCK_IN' },
      include: {
        material: { select: { materialCode: true, name: true, unit: true } },
        supplier: { select: { name: true, contactPerson: true } },
        issuedBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** 3. Stock Out Report */
  async getStockOutReport() {
    return this.prisma.inventoryTransaction.findMany({
      where: { type: 'STOCK_OUT' },
      include: {
        material: { select: { materialCode: true, name: true, unit: true } },
        department: { select: { name: true } },
        employee: { select: { fullName: true, employeeCode: true } },
        issuedBy: { select: { fullName: true } },
        approvedBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** 4. Material Balance Report */
  async getMaterialBalanceReport() {
    const materials = await this.prisma.material.findMany({
      include: {
        category: true,
        stockSummary: true,
      },
      orderBy: { name: 'asc' },
    });

    return materials.map((m) => ({
      materialCode: m.materialCode,
      materialName: m.name,
      category: m.category.name,
      unit: m.unit,
      quantityReceived: m.stockSummary?.quantityReceived ?? 0,
      quantityIssued: m.stockSummary?.quantityIssued ?? 0,
      remainingQuantity: m.stockSummary?.remainingQuantity ?? 0,
      status:
        (m.stockSummary?.remainingQuantity ?? 0) <= m.minimumStock
          ? 'LOW_STOCK'
          : 'HEALTHY',
    }));
  }

  /** 5. Low Stock Report */
  async getLowStockReport() {
    const materials = await this.prisma.material.findMany({
      include: {
        category: true,
        stockSummary: true,
      },
      orderBy: { name: 'asc' },
    });

    return materials
      .filter((m) => (m.stockSummary?.remainingQuantity ?? 0) <= m.minimumStock)
      .map((m) => ({
        materialCode: m.materialCode,
        name: m.name,
        category: m.category.name,
        unit: m.unit,
        minimumStock: m.minimumStock,
        remainingQuantity: m.stockSummary?.remainingQuantity ?? 0,
        reorderShortage: m.minimumStock - (m.stockSummary?.remainingQuantity ?? 0),
        location: m.location,
      }));
  }

  /** 6. Employee Issue Report */
  async getEmployeeIssueReport(employeeId?: string) {
    const where: any = { type: 'STOCK_OUT' };
    if (employeeId) where.employeeId = employeeId;

    return this.prisma.inventoryTransaction.findMany({
      where,
      include: {
        material: { select: { materialCode: true, name: true, unit: true } },
        employee: { select: { employeeCode: true, fullName: true, department: { select: { name: true } } } },
        department: { select: { name: true } },
        issuedBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** 7. Supplier Report */
  async getSupplierReport() {
    const suppliers = await this.prisma.supplier.findMany({
      include: {
        transactions: {
          include: {
            material: { select: { materialCode: true, name: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return suppliers.map((s) => ({
      supplierCode: s.supplierCode,
      supplierName: s.name,
      contactPerson: s.contactPerson,
      email: s.email,
      phone: s.phone,
      totalSupplies: s.transactions.length,
      totalItemsSupplied: s.transactions.reduce((acc, t) => acc + t.quantity, 0),
    }));
  }

  /** 8. Full Transaction History Report */
  async getTransactionHistoryReport() {
    return this.prisma.inventoryTransaction.findMany({
      include: {
        material: { select: { materialCode: true, name: true, unit: true } },
        supplier: { select: { name: true } },
        employee: { select: { fullName: true } },
        department: { select: { name: true } },
        issuedBy: { select: { fullName: true } },
        approvedBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
