import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestStatus, TransactionType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { AccessControlService } from '../auth/access-control.service';
import { SafeUser } from '../auth/decorators/current-user.decorator';

export interface CreateRequestDto {
  purpose: string;
  departmentId: string;
  storeId?: string;
  items: {
    materialId: string;
    quantityRequested: number;
  }[];
}

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly accessControlService: AccessControlService,
  ) {}

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
        storeId: dto.storeId || null,
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
        store: true,
        items: {
          include: {
            material: {
              include: { stockSummary: true },
            },
          },
        },
      },
    });

    // Notify all Store Managers about the new request
    const managerIds = await this.notifications.getUserIdsByRole('STORE_MANAGER');
    await this.notifications.createForUsers(
      managerIds,
      'REQUEST_SUBMITTED',
      'New Material Request Submitted',
      `${request.requester.fullName} submitted request ${requestNumber}: "${dto.purpose}"`,
      { requestId: request.id, requestNumber },
    );

    return request;
  }

  async findAll(query?: { status?: RequestStatus; requesterId?: string; departmentId?: string; storeId?: string }) {
    const where: any = {};
    if (query?.status) where.status = query.status;
    if (query?.requesterId) where.requesterId = query.requesterId;
    if (query?.departmentId) where.departmentId = query.departmentId;
    if (query?.storeId) where.storeId = query.storeId;

    return this.prisma.materialRequest.findMany({
      where,
      include: {
        requester: { select: { id: true, fullName: true, email: true } },
        department: true,
        store: true,
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
        store: true,
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
  async approveOrReject(id: string, user: SafeUser, action: 'APPROVE' | 'REJECT', remarks?: string) {
    const request = await this.prisma.materialRequest.findUnique({
      where: { id },
      include: {
        store: true,
        items: { include: { material: { include: { stockSummary: true } } } },
      },
    });

    if (!request) {
      throw new NotFoundException(`Request ${id} not found`);
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException(`Request is already in status ${request.status}`);
    }

    // Scope Enforcement (Requirement R2)
    this.accessControlService.enforceStoreScope(user, request.storeId);

    const newStatus = action === 'APPROVE' ? RequestStatus.APPROVED : RequestStatus.REJECTED;

    const updated = await this.prisma.materialRequest.update({
      where: { id },
      data: {
        status: newStatus,
        approvedById: user.id,
        approvedAt: new Date(),
        managerRemarks: remarks,
      },
      include: {
        requester: { select: { fullName: true, email: true, id: true } },
        department: true,
        store: true,
        approvedBy: { select: { fullName: true } },
        items: { include: { material: true } },
      },
    });

    // Notify the requester of the decision
    const isApproved = action === 'APPROVE';
    await this.notifications.createForUsers(
      [updated.requester.id],
      isApproved ? 'REQUEST_APPROVED' : 'REQUEST_REJECTED',
      isApproved ? 'Material Request Approved ✓' : 'Material Request Rejected',
      isApproved
        ? `Your request ${request.requestNumber} has been approved by the Store Manager.${remarks ? ` Remarks: ${remarks}` : ''}`
        : `Your request ${request.requestNumber} was rejected.${remarks ? ` Reason: ${remarks}` : ''}`,
      { requestId: id, requestNumber: request.requestNumber },
    );

    return updated;
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
    const result = await this.prisma.$transaction(async (tx) => {
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
          requester: { select: { fullName: true, email: true, id: true } },
          department: true,
          approvedBy: { select: { fullName: true, id: true } },
          items: { include: { material: true } },
        },
      });
    });

    // Notify requester that materials have been issued
    await this.notifications.createForUsers(
      [result.requester.id],
      'REQUEST_ISSUED',
      'Materials Issued — Ready for Collection ✓',
      `Materials for your request ${request.requestNumber} have been issued. Please collect from the store.`,
      { requestId: id, requestNumber: request.requestNumber },
    );

    // Notify the approving manager as well
    if (result.approvedBy?.id) {
      await this.notifications.createForUsers(
        [result.approvedBy.id],
        'REQUEST_ISSUED',
        `Request ${request.requestNumber} Fulfilled`,
        `Request ${request.requestNumber} has been fulfilled by the storekeeper.`,
        { requestId: id, requestNumber: request.requestNumber },
      );
    }

    return result;
  }
}
