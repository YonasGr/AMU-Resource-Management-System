import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const totalMaterials = await this.prisma.material.count({ where: { status: 'ACTIVE' } });
    const totalDepartments = await this.prisma.department.count();
    const totalEmployees = await this.prisma.employee.count();
    const totalSuppliers = await this.prisma.supplier.count();

    const pendingRequests = await this.prisma.materialRequest.count({ where: { status: 'PENDING' } });
    const approvedRequests = await this.prisma.materialRequest.count({ where: { status: 'APPROVED' } });

    const materials = await this.prisma.material.findMany({
      include: { stockBalances: true, category: true },
    });

    const lowStockItems = materials.filter(
      (m) => m.stockBalances.reduce((sum, balance) => sum + balance.remainingQuantity, 0) <= m.minimumStock,
    );

    const recentTransactions = await this.prisma.inventoryTransaction.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        material: { select: { name: true, unit: true } },
        issuedBy: { select: { fullName: true } },
      },
    });

    const stockInCount = await this.prisma.inventoryTransaction.count({ where: { type: 'STOCK_IN' } });
    const stockOutCount = await this.prisma.inventoryTransaction.count({ where: { type: 'STOCK_OUT' } });

    return {
      overview: {
        totalMaterials,
        totalDepartments,
        totalEmployees,
        totalSuppliers,
        pendingRequests,
        approvedRequests,
        lowStockCount: lowStockItems.length,
        stockInCount,
        stockOutCount,
      },
      lowStockAlerts: lowStockItems.map((m) => ({
        id: m.id,
        materialCode: m.materialCode,
        name: m.name,
        category: m.category.name,
        remainingQuantity: m.stockBalances.reduce((sum, balance) => sum + balance.remainingQuantity, 0),
        minimumStock: m.minimumStock,
        unit: m.unit,
        location: m.location,
      })),
      recentTransactions,
    };
  }

  async getExceptions() {
    const now = Date.now();
    const receiptCutoff = new Date(now - 3 * 24 * 60 * 60 * 1000);
    const countCutoff = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [receiving, cycleCounts, quarantine, varianceLines] = await Promise.all([
      this.prisma.goodsReceipt.findMany({
        where: {
          status: { in: ['DRAFT', 'INSPECTED'] },
          createdAt: { lt: receiptCutoff },
        },
        take: 20,
        orderBy: { createdAt: 'asc' },
        include: {
          material: { select: { materialCode: true, name: true, unit: true } },
          store: { select: { name: true } },
        },
      }),
      this.prisma.cycleCount.findMany({
        where: {
          status: { in: ['DRAFT', 'COUNTED', 'RECOUNT_REQUIRED'] },
          createdAt: { lt: countCutoff },
        },
        take: 20,
        orderBy: { createdAt: 'asc' },
        include: {
          store: { select: { name: true } },
          lines: { select: { materialId: true, physicalQuantity: true, variance: true } },
        },
      }),
      this.prisma.materialReturn.findMany({
        where: {
          disposition: 'QUARANTINE',
          status: { not: 'CANCELLED' },
        },
        take: 20,
        orderBy: { createdAt: 'asc' },
        include: {
          material: { select: { materialCode: true, name: true, unit: true } },
          store: { select: { name: true } },
        },
      }),
      this.prisma.cycleCountLine.findMany({
        where: {
          variance: { not: 0 },
          cycleCount: { status: 'APPROVED' },
        },
        take: 20,
        orderBy: { updatedAt: 'desc' },
        include: {
          material: { select: { materialCode: true, name: true, unit: true } },
          cycleCount: { select: { countCode: true, store: { select: { name: true } }, updatedAt: true } },
        },
      }),
    ]);

    return {
      asOf: new Date().toISOString(),
      receiving: receiving.map((item) => ({
        id: item.id,
        code: item.receiptCode,
        status: item.status,
        ageDays: Math.floor((now - item.createdAt.getTime()) / 86400000),
        material: item.material,
        store: item.store,
      })),
      cycleCounts: cycleCounts.map((item) => ({
        id: item.id,
        code: item.countCode,
        status: item.status,
        ageDays: Math.floor((now - item.createdAt.getTime()) / 86400000),
        lineCount: item.lines.length,
        store: item.store,
      })),
      quarantine,
      variances: varianceLines.map((line) => ({
        id: line.id,
        variance: line.variance,
        physicalQuantity: line.physicalQuantity,
        material: line.material,
        count: line.cycleCount,
      })),
    };
  }
}
