import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportQueryDto } from './dto/report-query.dto';

const reportDateFilter = (query: ReportQueryDto) => ({
  ...(query.from || query.to
    ? {
        gte: query.from ? new Date(query.from) : undefined,
        lte: query.to ? new Date(query.to) : undefined,
      }
    : {}),
});

const pagination = (query: ReportQueryDto) => ({
  skip: (query.page - 1) * query.pageSize,
  take: query.pageSize,
});

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 1. Current Stock Report */
  async getCurrentStockReport(query: ReportQueryDto) {
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
          where: query.storeId ? { storeId: query.storeId } : undefined,
          select: {
            quantityReceived: true,
            quantityIssued: true,
            remainingQuantity: true,
          },
        },
      },
      orderBy: { name: 'asc' },
      ...pagination(query),
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
  async getStockInReport(query: ReportQueryDto) {
    return this.prisma.inventoryTransaction.findMany({
      where: {
        type: 'STOCK_IN',
        storeId: query.storeId,
        createdAt: reportDateFilter(query),
      },
      include: {
        material: { select: { materialCode: true, name: true, unit: true } },
        supplier: { select: { name: true, contactPerson: true } },
        issuedBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      ...pagination(query),
    });
  }

  /** 3. Stock Out Report */
  async getStockOutReport(query: ReportQueryDto) {
    return this.prisma.inventoryTransaction.findMany({
      where: {
        type: 'STOCK_OUT',
        storeId: query.storeId,
        createdAt: reportDateFilter(query),
      },
      include: {
        material: { select: { materialCode: true, name: true, unit: true } },
        department: { select: { name: true } },
        employee: { select: { fullName: true, employeeCode: true } },
        issuedBy: { select: { fullName: true } },
        approvedBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      ...pagination(query),
    });
  }

  /** 4. Material Balance Report */
  async getMaterialBalanceReport(query: ReportQueryDto) {
    const materials = await this.prisma.material.findMany({
      include: {
        category: true,
        stockBalances: query.storeId ? { where: { storeId: query.storeId } } : true,
      },
      orderBy: { name: 'asc' },
      ...pagination(query),
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
  async getLowStockReport(query: ReportQueryDto) {
    const materials = await this.prisma.material.findMany({
      include: {
        category: true,
        stockBalances: query.storeId ? { where: { storeId: query.storeId } } : true,
      },
      orderBy: { name: 'asc' },
      take: Math.min(query.page * query.pageSize, 500),
    });

    return materials
      .map((m) => ({
        material: m,
        remainingQuantity: m.stockBalances.reduce((sum, balance) => sum + balance.remainingQuantity, 0),
      }))
      .filter(({ material, remainingQuantity }) => remainingQuantity <= material.minimumStock)
      .slice((query.page - 1) * query.pageSize, query.page * query.pageSize)
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
  async getEmployeeIssueReport(employeeId: string | undefined, query: ReportQueryDto) {
    const where: any = {
      type: 'STOCK_OUT',
      storeId: query.storeId,
      createdAt: reportDateFilter(query),
    };
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
      ...pagination(query),
    });
  }

  /** 7. Supplier Report */
  async getSupplierReport(query: ReportQueryDto) {
    const suppliers = await this.prisma.supplier.findMany({
      include: {
        transactions: {
          where: {
            storeId: query.storeId,
            createdAt: reportDateFilter(query),
          },
          include: {
            material: { select: { materialCode: true, name: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
      ...pagination(query),
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
  async getTransactionHistoryReport(query: ReportQueryDto) {
    return this.prisma.inventoryTransaction.findMany({
      where: {
        storeId: query.storeId,
        createdAt: reportDateFilter(query),
      },
      include: {
        material: { select: { materialCode: true, name: true, unit: true } },
        supplier: { select: { name: true } },
        employee: { select: { fullName: true } },
        department: { select: { name: true } },
        issuedBy: { select: { fullName: true } },
        approvedBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      ...pagination(query),
    });
  }
}
