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
      include: { stockSummary: true, category: true },
    });

    const lowStockItems = materials.filter(
      (m) => (m.stockSummary?.remainingQuantity ?? 0) <= m.minimumStock,
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
        remainingQuantity: m.stockSummary?.remainingQuantity ?? 0,
        minimumStock: m.minimumStock,
        unit: m.unit,
        location: m.location,
      })),
      recentTransactions,
    };
  }
}
