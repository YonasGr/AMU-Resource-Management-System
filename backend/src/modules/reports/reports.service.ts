import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 1. Current Stock Report */
  async getCurrentStockReport() {
    const materials = await this.prisma.material.findMany({
      select: {
        id: true,
        materialCode: true,
        name: true,
        unit: true,
        location: true,
        minimumStock: true,
        category: { select: { name: true } },
        stockBalances: {
          select: {
            quantityReceived: true,
            quantityIssued: true,
            remainingQuantity: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return materials.map(({ stockBalances, ...material }) => ({
      ...material,
      stockSummary: stockBalances.reduce(
        (summary, balance) => ({
          quantityReceived: summary.quantityReceived + balance.quantityReceived,
          quantityIssued: summary.quantityIssued + balance.quantityIssued,
          remainingQuantity: summary.remainingQuantity + balance.remainingQuantity,
        }),
        { quantityReceived: 0, quantityIssued: 0, remainingQuantity: 0 },
      ),
    }));
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
        stockBalances: true,
      },
      orderBy: { name: 'asc' },
    });

    return materials.map((m) => ({
      materialCode: m.materialCode,
      materialName: m.name,
      category: m.category.name,
      unit: m.unit,
      quantityReceived: m.stockBalances.reduce((sum, balance) => sum + balance.quantityReceived, 0),
      quantityIssued: m.stockBalances.reduce((sum, balance) => sum + balance.quantityIssued, 0),
      remainingQuantity: m.stockBalances.reduce((sum, balance) => sum + balance.remainingQuantity, 0),
      status:
        m.stockBalances.reduce((sum, balance) => sum + balance.remainingQuantity, 0) <= m.minimumStock
          ? 'LOW_STOCK'
          : 'HEALTHY',
    }));
  }

  /** 5. Low Stock Report */
  async getLowStockReport() {
    const materials = await this.prisma.material.findMany({
      include: {
        category: true,
        stockBalances: true,
      },
      orderBy: { name: 'asc' },
    });

    return materials
      .map((m) => ({
        material: m,
        remainingQuantity: m.stockBalances.reduce((sum, balance) => sum + balance.remainingQuantity, 0),
      }))
      .filter(({ material, remainingQuantity }) => remainingQuantity <= material.minimumStock)
      .map((m) => ({
        materialCode: m.material.materialCode,
        name: m.material.name,
        category: m.material.category.name,
        unit: m.material.unit,
        minimumStock: m.material.minimumStock,
        remainingQuantity: m.remainingQuantity,
        reorderShortage: m.material.minimumStock - m.remainingQuantity,
        location: m.material.location,
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
