import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestStatus, TransactionType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { AccessControlService } from '../auth/access-control.service';
import { SafeUser } from '../auth/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { CreateRequestDto, IssueRequestItemDto } from './dto/request.dto';

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly accessControlService: AccessControlService,
    private readonly auditService: AuditService,
  ) {}

  async create(requesterId: string, dto: CreateRequestDto) {
    if (typeof this.prisma.user?.findUnique === 'function') {
      const requester = await this.prisma.user.findUnique({ where: { id: requesterId } });
      if (!requester || requester.status !== 'ACTIVE') {
        throw new ForbiddenException('Your account must be approved by an administrator before submitting material requests.');
      }
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('A material request must include at least one item');
    }

    let targetStoreId = dto.storeId || null;
    if (!targetStoreId) {
      const defaultStore = await this.prisma.store.findFirst();
      if (defaultStore) {
        targetStoreId = defaultStore.id;
      }
    }

    const year = new Date().getFullYear();
    const request = await this.prisma.$transaction(async (tx) => {
      const counter = await tx.requestNumberCounter.upsert({
        where: { year },
        update: { nextNumber: { increment: 1 } },
        create: { year, nextNumber: 2 },
        select: { nextNumber: true },
      });
      const requestNumber = `REQ-${year}-${String(counter.nextNumber - 1).padStart(4, '0')}`;

      return tx.materialRequest.create({
        data: {
          requestNumber,
          purpose: dto.purpose,
          requesterId,
          departmentId: dto.departmentId,
          storeId: targetStoreId,
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
    });

    // Log Audit Event
    await this.auditService.log(
      requesterId,
      'CREATE_REQUEST',
      'REQUESTS',
      `Submitted requisition ${request.requestNumber} for ${request.department?.name || 'Department'} (${dto.items.length} item line(s)): "${dto.purpose}"`,
    );

    // Notify all Store Managers about the new request
    const managerIds = await this.notifications.getUserIdsByRole('STORE_MANAGER');
    await this.notifications.createForUsers(
      managerIds,
      'REQUEST_SUBMITTED',
      'New Material Request Submitted',
      `${request.requester.fullName} submitted request ${request.requestNumber}: "${dto.purpose}"`,
      { requestId: request.id, requestNumber: request.requestNumber },
    );

    return request;
  }

  async findAll(
    user: SafeUser,
    query?: { status?: RequestStatus; requesterId?: string; departmentId?: string; storeId?: string },
  ) {
    const filters: Record<string, string> = {};
    if (query?.status) filters.status = query.status;
    if (query?.requesterId) filters.requesterId = query.requesterId;
    if (query?.departmentId) filters.departmentId = query.departmentId;
    if (query?.storeId) filters.storeId = query.storeId;
    const visibility = this.accessControlService.getRequestVisibilityWhere(user);
    const where: any = Object.keys(filters).length
      ? { AND: [visibility, filters] }
      : visibility;

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

  async findOne(id: string, user: SafeUser) {
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
    if (!request || !this.accessControlService.canViewRequest(user, request)) {
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
    if (request.requesterId === user.id) {
      throw new ForbiddenException('A requester cannot approve or reject their own request');
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException(`Request is already in status ${request.status}`);
    }

    // Scope Enforcement (Requirement R2)
    const targetStoreId = request.storeId || user.storeId;
    this.accessControlService.enforceStoreScope(user, targetStoreId);

    const updated = action === 'APPROVE'
      ? await this.prisma.$transaction(async (tx) => {
          if (!targetStoreId) {
            throw new BadRequestException('The approved request must be assigned to a store');
          }

          for (const item of request.items) {
            const balance = await tx.stockBalance.findUnique({
              where: {
                storeId_materialId: {
                  storeId: targetStoreId,
                  materialId: item.materialId,
                },
              },
            });
            const available = (balance?.remainingQuantity ?? 0) - (balance?.reservedQuantity ?? 0);
            if (!balance || available < item.quantityRequested) {
              throw new BadRequestException(
                `Insufficient available stock to approve "${item.material.name}". Requested: ${item.quantityRequested}, Available: ${Math.max(0, available)}`,
              );
            }

            const reserved = await tx.stockBalance.updateMany({
              where: {
                id: balance.id,
                remainingQuantity: { gte: item.quantityRequested },
                reservedQuantity: balance.reservedQuantity,
              },
              data: { reservedQuantity: { increment: item.quantityRequested } },
            });
            if (reserved.count !== 1) {
              throw new BadRequestException(
                `Stock changed while approving "${item.material.name}". Refresh and try again.`,
              );
            }

            await tx.materialRequestItem.update({
              where: { id: item.id },
              data: { quantityReserved: item.quantityRequested },
            });
          }

          return tx.materialRequest.update({
            where: { id },
            data: {
              status: RequestStatus.APPROVED,
              storeId: targetStoreId,
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
        })
      : await this.prisma.materialRequest.update({
          where: { id },
          data: {
            status: RequestStatus.REJECTED,
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

    // Log Audit Event
    await this.auditService.log(
      user.id,
      action === 'APPROVE' ? 'APPROVE_REQUEST' : 'REJECT_REQUEST',
      'REQUESTS',
      `${user.fullName} (${user.role}) ${action === 'APPROVE' ? 'approved' : 'rejected'} request ${request.requestNumber}.${remarks ? ` Remarks: ${remarks}` : ''}`,
    );

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
  async issueItems(
    id: string,
    user: SafeUser,
    employeeId?: string,
    remarks?: string,
    requestedItems?: IssueRequestItemDto[],
  ) {
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

    if (!this.accessControlService.canViewRequest(user, request)) {
      throw new NotFoundException(`Request ${id} not found`);
    }

    if (
      request.status !== RequestStatus.APPROVED &&
      request.status !== RequestStatus.PARTIALLY_ISSUED &&
      request.status !== RequestStatus.BACKORDERED
    ) {
      throw new BadRequestException(
        `Only APPROVED or PARTIALLY_ISSUED requests can be issued. Current status is ${request.status}`,
      );
    }

    const issueQuantities = new Map(
      (requestedItems ?? request.items.map((item) => ({
        requestItemId: item.id,
        quantity: item.quantityRequested - item.quantityIssued,
      }))).map((item) => [item.requestItemId, item.quantity]),
    );
    if (issueQuantities.size === 0 || [...issueQuantities.values()].some((quantity) => quantity < 1)) {
      throw new BadRequestException('At least one positive issue quantity is required');
    }
    const requestItemIds = new Set(request.items.map((item) => item.id));
    if ([...issueQuantities.keys()].some((itemId) => !requestItemIds.has(itemId))) {
      throw new BadRequestException('Every issue line must belong to the request');
    }

    // Execute in DB Transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const timeStamp = Date.now().toString().slice(-6);
      let itemSeq = 1;

      for (const item of request.items) {
        const issueQuantity = issueQuantities.get(item.id);
        if (issueQuantity === undefined) continue;
        const outstanding = item.quantityRequested - item.quantityIssued;
        if (issueQuantity > outstanding) {
          throw new BadRequestException(
            `Cannot issue ${issueQuantity} for "${item.material.name}". Only ${outstanding} remains outstanding`,
          );
        }
        if (item.quantityReserved > 0 && issueQuantity > item.quantityReserved) {
          throw new BadRequestException(
            `Cannot issue ${issueQuantity} for "${item.material.name}". Only ${item.quantityReserved} is reserved`,
          );
        }
        if (!request.storeId) {
          throw new BadRequestException('The approved request is not assigned to a store');
        }

        const decremented = await tx.stockBalance.updateMany({
          where: {
            materialId: item.materialId,
            storeId: request.storeId,
            remainingQuantity: { gte: issueQuantity },
            ...(item.quantityReserved > 0 ? { reservedQuantity: { gte: issueQuantity } } : {}),
          },
          data: {
            quantityIssued: { increment: issueQuantity },
            remainingQuantity: { decrement: issueQuantity },
            ...(item.quantityReserved > 0 ? { reservedQuantity: { decrement: issueQuantity } } : {}),
          },
        });
        if (decremented.count !== 1) {
          const remaining = item.material.stockSummary?.remainingQuantity ?? 0;
          throw new BadRequestException(
            `Insufficient stock for "${item.material.name}". Requested: ${issueQuantity}, Available: ${remaining}`,
          );
        }

        await tx.stockSummary.updateMany({
          where: {
            materialId: item.materialId,
            remainingQuantity: { gte: issueQuantity },
          },
          data: {
            quantityIssued: { increment: issueQuantity },
            remainingQuantity: { decrement: issueQuantity },
          },
        });

        const txnCode = `TXN-OUT-${timeStamp}-${String(itemSeq++).padStart(3, '0')}`;

        // Create Stock Out Transaction
        await tx.inventoryTransaction.create({
          data: {
            transactionCode: txnCode,
            type: TransactionType.STOCK_OUT,
            materialId: item.materialId,
            quantity: issueQuantity,
            requestId: request.id,
            requestItemId: item.id,
            storeId: request.storeId,
            departmentId: request.departmentId,
            employeeId: employeeId || null,
            issuedById: user.id,
            approvedById: request.approvedById,
            purpose: request.purpose,
            remarks: remarks || `Issued for Request ${request.requestNumber}`,
          },
        });

        // Update item issued quantity
        await tx.materialRequestItem.update({
          where: { id: item.id },
          data: {
            quantityIssued: { increment: issueQuantity },
            ...(item.quantityReserved > 0
              ? { quantityReserved: { decrement: issueQuantity } }
              : {}),
          },
        });
      }

      const fullyIssued = request.items.every(
        (item) => item.quantityIssued + (issueQuantities.get(item.id) ?? 0) >= item.quantityRequested,
      );

      return tx.materialRequest.update({
        where: { id },
        data: {
          status: fullyIssued ? RequestStatus.ISSUED : request.status === RequestStatus.BACKORDERED
            ? RequestStatus.BACKORDERED
            : RequestStatus.PARTIALLY_ISSUED,
        },
        include: {
          requester: { select: { fullName: true, email: true, id: true } },
          department: true,
          approvedBy: { select: { fullName: true, id: true } },
          items: { include: { material: true } },
        },
      });
    });

    // Log Audit Event
    await this.auditService.log(
      user.id,
      'ISSUE_REQUEST',
      'REQUESTS',
      `Storekeeper issued materials for request ${request.requestNumber} (${[...issueQuantities.values()].reduce((sum, quantity) => sum + quantity, 0)} unit(s))`,
    );

    // Notify requester that materials have been issued
    await this.notifications.createForUsers(
      [result.requester.id],
      'REQUEST_ISSUED',
      result.status === RequestStatus.ISSUED ? 'Materials Issued — Ready for Collection ✓' : 'Request Partially Issued',
      result.status === RequestStatus.ISSUED
        ? `Materials for your request ${request.requestNumber} have been issued. Please collect from the store.`
        : `Part of request ${request.requestNumber} has been issued. Remaining items are still outstanding.`,
      { requestId: id, requestNumber: request.requestNumber },
    );

    // Notify the approving manager as well
    if (result.approvedBy?.id) {
      await this.notifications.createForUsers(
        [result.approvedBy.id],
        'REQUEST_ISSUED',
        `Request ${request.requestNumber} Fulfilled`,
        result.status === RequestStatus.ISSUED
          ? `Request ${request.requestNumber} has been fulfilled by the storekeeper.`
          : `Request ${request.requestNumber} has been partially issued by the storekeeper.`,
        { requestId: id, requestNumber: request.requestNumber },
      );
    }

    return result;
  }

  async backorder(id: string, user: SafeUser, remarks?: string) {
    const request = await this.prisma.materialRequest.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!request || !this.accessControlService.canViewRequest(user, request)) {
      throw new NotFoundException(`Material request ${id} not found`);
    }
    if (request.status !== RequestStatus.APPROVED && request.status !== RequestStatus.PARTIALLY_ISSUED) {
      throw new BadRequestException(`Only APPROVED or PARTIALLY_ISSUED requests can be backordered. Current status is ${request.status}`);
    }
    const result = await this.prisma.materialRequest.update({
      where: { id },
      data: { status: RequestStatus.BACKORDERED, managerRemarks: remarks },
      include: { items: { include: { material: true } }, requester: true, store: true },
    });
    await this.auditService.log(user.id, 'BACKORDER_REQUEST', 'REQUESTS', `Backordered request ${request.requestNumber}`);
    return result;
  }

  async cancel(id: string, user: SafeUser, reason: string) {
    const request = await this.prisma.materialRequest.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!request || !this.accessControlService.canViewRequest(user, request)) {
      throw new NotFoundException(`Material request ${id} not found`);
    }
    if (
      request.status !== RequestStatus.PENDING &&
      request.status !== RequestStatus.APPROVED &&
      request.status !== RequestStatus.PARTIALLY_ISSUED &&
      request.status !== RequestStatus.BACKORDERED
    ) {
      throw new BadRequestException(`Request cannot be cancelled from status ${request.status}`);
    }
    if (request.items.some((item) => item.quantityIssued > 0)) {
      throw new BadRequestException('Issued request lines must be returned before cancellation');
    }
    const result = await this.prisma.$transaction(async (tx) => {
      if (request.status === RequestStatus.APPROVED || request.status === RequestStatus.PARTIALLY_ISSUED || request.status === RequestStatus.BACKORDERED) {
        if (request.storeId) {
          for (const item of request.items) {
            if (item.quantityReserved <= 0) continue;
            const released = await tx.stockBalance.updateMany({
              where: {
                storeId: request.storeId,
                materialId: item.materialId,
                reservedQuantity: { gte: item.quantityReserved },
              },
              data: { reservedQuantity: { decrement: item.quantityReserved } },
            });
            if (released.count !== 1) throw new BadRequestException('Reserved stock changed; refresh and retry');
          }
        }
        await tx.materialRequestItem.updateMany({
          where: { requestId: id },
          data: { quantityReserved: 0 },
        });
      }
      return tx.materialRequest.update({
        where: { id },
        data: {
          status: RequestStatus.CANCELLED,
          cancelledById: user.id,
          cancelledAt: new Date(),
          cancellationReason: reason,
        },
        include: { items: true, requester: true, store: true },
      });
    });
    await this.auditService.log(user.id, 'CANCEL_REQUEST', 'REQUESTS', `Cancelled request ${request.requestNumber}: ${reason}`);
    return result;
  }

  async handover(id: string, user: SafeUser, evidence: string) {
    const request = await this.prisma.materialRequest.findUnique({ where: { id } });
    if (!request || !this.accessControlService.canViewRequest(user, request)) {
      throw new NotFoundException(`Material request ${id} not found`);
    }
    if (request.status !== RequestStatus.ISSUED) {
      throw new BadRequestException(`Only ISSUED requests can be handed over. Current status is ${request.status}`);
    }
    const result = await this.prisma.materialRequest.update({
      where: { id },
      data: { handoverEvidence: evidence, handedOverById: user.id, handedOverAt: new Date() },
    });
    await this.auditService.log(user.id, 'HANDOVER_REQUEST', 'REQUESTS', `Recorded handover for request ${request.requestNumber}`);
    return result;
  }

  async confirm(id: string, user: SafeUser) {
    const request = await this.prisma.materialRequest.findUnique({
      where: { id },
      include: { items: true, materialReturns: { where: { status: { in: ['DRAFT', 'INSPECTED'] } } } },
    });
    if (!request || request.requesterId !== user.id) {
      throw new NotFoundException(`Material request ${id} not found`);
    }
    if (request.status !== RequestStatus.ISSUED || !request.handoverEvidence) {
      throw new BadRequestException('An issued request must have handover evidence before confirmation');
    }
    if (request.items.some((item) => item.quantityIssued < item.quantityRequested || item.quantityReturned > item.quantityIssued)) {
      throw new BadRequestException('All requested quantities must be issued before confirmation');
    }
    if (request.materialReturns.length > 0) {
      throw new BadRequestException('Open return inspections must be completed before confirmation');
    }
    const result = await this.prisma.materialRequest.update({
      where: { id },
      data: { status: RequestStatus.CLOSED, confirmedById: user.id, confirmedAt: new Date(), closedAt: new Date() },
    });
    await this.auditService.log(user.id, 'CONFIRM_REQUEST', 'REQUESTS', `Requester confirmed and closed ${request.requestNumber}`);
    return result;
  }
}
