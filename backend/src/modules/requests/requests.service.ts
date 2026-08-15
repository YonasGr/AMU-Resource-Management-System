import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestStatus, TransactionType } from '@prisma/client';

export interface CreateRequestDto {
  purpose: string;
  departmentId: string;
  items: {
    materialId: string;
    quantityRequested: number;
  }[];
}

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(requesterId: string, dto: CreateRequestDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('A material request must include at least one item');
    }

    const count = await this.prisma.materialRequest.count();
    const requestNumber = `REQ-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const request = await this.prisma.materialRequest.create({
      data: {
        requestNumber,
        purpose: dto.purpose,
        requesterId,
        departmentId: dto.departmentId,
        status: RequestStatus.PENDING,
        items: {
          create: dto.items.map((item) => ({
            materialId: item.materialId,
            quantityRequested: item.quantityRequested,
          })),
        },
      },
      include: {
        requester: { select: { id: true, fullName: true, email: true } },
        department: true,
        items: {
          include: {
            material: {
              include: { stockSummary: true },
            },
          },
        },
      },
    });

    return request;
  }

  async findAll(query?: { status?: RequestStatus; requesterId?: string; departmentId?: string }) {
    const where: any = {};
    if (query?.status) where.status = query.status;
    if (query?.requesterId) where.requesterId = query.requesterId;
    if (query?.departmentId) where.departmentId = query.departmentId;

    return this.prisma.materialRequest.findMany({
      where,
      include: {
        requester: { select: { id: true, fullName: true, email: true } },
        department: true,
        approvedBy: { select: { id: true, fullName: true } },
        items: {
          include: {
            material: { select: { id: true, materialCode: true, name: true, unit: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const request = await this.prisma.materialRequest.findUnique({
      where: { id },
      include: {
        requester: { select: { id: true, fullName: true, email: true } },
        department: true,
        approvedBy: { select: { id: true, fullName: true } },
        items: {
          include: {
            material: {
              include: { stockSummary: true },
            },
          },
        },
        transactions: {
          include: {
            issuedBy: { select: { fullName: true } },
          },
        },
      },
    });
    if (!request) {
      throw new NotFoundException(`Material request ${id} not found`);
    }
    return request;
  }

  /** Store Manager approves or rejects request */
  async approveOrReject(id: string, managerId: string, action: 'APPROVE' | 'REJECT', remarks?: string) {
    const request = await this.prisma.materialRequest.findUnique({
      where: { id },
      include: { items: { include: { material: { include: { stockSummary: true } } } } },
    });

    if (!request) {
      throw new NotFoundException(`Request ${id} not found`);
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException(`Request is already in status ${request.status}`);
    }

    const newStatus = action === 'APPROVE' ? RequestStatus.APPROVED : RequestStatus.REJECTED;

    return this.prisma.materialRequest.update({
      where: { id },
      data: {
        status: newStatus,
        approvedById: managerId,
        approvedAt: new Date(),
        managerRemarks: remarks,
      },
      include: {
        requester: { select: { fullName: true, email: true } },
        department: true,
        approvedBy: { select: { fullName: true } },
        items: { include: { material: true } },
      },
    });
  }

  /** Storekeeper issues materials for an approved request */
  async issueItems(id: string, storekeeperId: string, employeeId?: string, remarks?: string) {
    const request = await this.prisma.materialRequest.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            material: {
              include: { stockSummary: true },
            },
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(`Request ${id} not found`);
    }

    if (request.status !== RequestStatus.APPROVED) {
      throw new BadRequestException(`Only APPROVED requests can be issued. Current status is ${request.status}`);
    }

    // Execute in DB Transaction
    return this.prisma.$transaction(async (tx) => {
      const timeStamp = Date.now().toString().slice(-6);
      let itemSeq = 1;

      for (const item of request.items) {
        const remaining = item.material.stockSummary?.remainingQuantity ?? 0;
        if (remaining < item.quantityRequested) {
          throw new BadRequestException(
            `Insufficient stock for "${item.material.name}". Requested: ${item.quantityRequested}, Available: ${remaining}`,
          );
        }

        const txnCode = `TXN-OUT-${timeStamp}-${String(itemSeq++).padStart(3, '0')}`;

        // Create Stock Out Transaction
        await tx.inventoryTransaction.create({
          data: {
            transactionCode: txnCode,
            type: TransactionType.STOCK_OUT,
            materialId: item.materialId,
            quantity: item.quantityRequested,
            requestId: request.id,
            departmentId: request.departmentId,
            employeeId: employeeId || null,
            issuedById: storekeeperId,
            approvedById: request.approvedById,
            purpose: request.purpose,
            remarks: remarks || `Issued for Request ${request.requestNumber}`,
          },
        });

        // Update StockSummary
        await tx.stockSummary.update({
          where: { materialId: item.materialId },
          data: {
            quantityIssued: { increment: item.quantityRequested },
            remainingQuantity: { decrement: item.quantityRequested },
          },
        });

        // Update item issued quantity
        await tx.materialRequestItem.update({
          where: { id: item.id },
          data: { quantityIssued: item.quantityRequested },
        });
      }

      // Mark request as ISSUED
      return tx.materialRequest.update({
        where: { id },
        data: {
          status: RequestStatus.ISSUED,
        },
        include: {
          requester: { select: { fullName: true, email: true } },
          department: true,
          approvedBy: { select: { fullName: true } },
          items: { include: { material: true } },
        },
      });
    });
  }
}
