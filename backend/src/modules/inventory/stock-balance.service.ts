import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { findStockSummaryMismatches, StockSummaryMismatch } from './stock-balance.util';

@Injectable()
export class StockBalanceService {
  constructor(private readonly prisma: PrismaService) {}

  async findSummaryMismatches(): Promise<StockSummaryMismatch[]> {
    const materials = await this.prisma.material.findMany({
      select: {
        id: true,
        stockBalances: {
          select: {
            quantityReceived: true,
            quantityIssued: true,
            remainingQuantity: true,
            reservedQuantity: true,
          },
        },
        stockSummary: {
          select: {
            materialId: true,
            quantityReceived: true,
            quantityIssued: true,
            remainingQuantity: true,
          },
        },
      },
    });

    return findStockSummaryMismatches(materials);
  }
}
