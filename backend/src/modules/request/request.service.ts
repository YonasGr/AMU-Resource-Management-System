import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Request as RequestRecord } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkflowEngineService } from '../workflow/workflow-engine.service';
import { MovementService } from '../inventory/movement.service';
import { AccessControlService } from '../rbac/access-control.service';
import { SafeUser } from '../auth/decorators/current-user.decorator';
import { CreateItemRequestDto } from './dto/create-item-request.dto';
import { CreateTransferRequestDto } from './dto/create-transfer-request.dto';
import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto';

interface ItemRequestDetails {
  itemId: string;
  targetStoreId: string;
  quantity: number;
  notes?: string;
}

interface TransferRequestDetails {
  itemId: string;
  sourceStoreId: string;
  destinationStoreId: string;
  quantity: number;
  notes?: string;
}

interface PurchaseRequestDetails {
  lines: Array<{ itemId: string; quantity: number }>;
  notes?: string;
}

/**
 * The generic request lifecycle every request type (spec section 12) runs
 * through: Draft -> Submitted -> Pending Approval -> Approved -> Executed ->
 * Completed (or Rejected/Cancelled). Submitting hands off to the Workflow
 * Engine; when that workflow finishes, THIS service — not the engine — is
 * responsible for actually doing the thing the request asked for (issuing
 * stock, transferring stock, ...). The engine only knows about approval
 * chains, never about inventory.
 */
@Injectable()
export class RequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowEngineService: WorkflowEngineService,
    private readonly movementService: MovementService,
    private readonly accessControlService: AccessControlService,
  ) {}

  async createItemRequest(
    dto: CreateItemRequestDto,
    requester: SafeUser,
  ): Promise<RequestRecord> {
    await this.assertItemExists(dto.itemId);
    await this.assertStoreExists(dto.targetStoreId);

    const details: ItemRequestDetails = {
      itemId: dto.itemId,
      targetStoreId: dto.targetStoreId,
      quantity: dto.quantity,
      notes: dto.notes,
    };

    return this.prisma.request.create({
      data: {
        type: 'ITEM_REQUEST',
        requesterId: requester.id,
        organizationId: requester.organizationId,
        details: details as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async createTransferRequest(
    dto: CreateTransferRequestDto,
    requester: SafeUser,
  ): Promise<RequestRecord> {
    if (dto.sourceStoreId === dto.destinationStoreId) {
      throw new BadRequestException('Source and destination stores must be different');
    }
    await this.assertItemExists(dto.itemId);
    await this.assertStoreExists(dto.sourceStoreId);
    await this.assertStoreExists(dto.destinationStoreId);

    const details: TransferRequestDetails = {
      itemId: dto.itemId,
      sourceStoreId: dto.sourceStoreId,
      destinationStoreId: dto.destinationStoreId,
      quantity: dto.quantity,
      notes: dto.notes,
    };

    return this.prisma.request.create({
      data: {
        type: 'TRANSFER_REQUEST',
        requesterId: requester.id,
        organizationId: requester.organizationId,
        details: details as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async createPurchaseRequest(
    dto: CreatePurchaseRequestDto,
    requester: SafeUser,
  ): Promise<RequestRecord> {
    const itemIds = dto.lines.map((line) => line.itemId);
    if (new Set(itemIds).size !== itemIds.length) {
      throw new BadRequestException('Each item may appear only once in a purchase request');
    }
    await Promise.all(itemIds.map((itemId) => this.assertItemExists(itemId)));

    const details: PurchaseRequestDetails = { lines: dto.lines, notes: dto.notes };
    return this.prisma.request.create({
      data: {
        type: 'PURCHASE_REQUEST',
        requesterId: requester.id,
        organizationId: requester.organizationId,
        details: details as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /** Starts the approval chain — from here on, the workflow engine drives progress. */
  async submit(requestId: string, requester: SafeUser): Promise<RequestRecord> {
    const request = await this.findOneRaw(requestId);
    if (request.requesterId !== requester.id) {
      throw new ForbiddenException('Only the requester can submit this request');
    }
    if (request.status !== 'DRAFT') {
      throw new BadRequestException(`Request is already ${request.status.toLowerCase()}`);
    }

    const contextData = this.buildContextData(request);

    const instance = await this.workflowEngineService.createInstance(
      {
        templateCode: request.type,
        entityType: request.type,
        entityId: request.id,
        contextData,
      },
      requester.id,
    );

    return this.prisma.request.update({
      where: { id: request.id },
      data: { status: 'PENDING_APPROVAL', workflowInstanceId: instance.id },
    });
  }

  /**
   * Approves the request's current workflow step. If that was the LAST
   * step, immediately executes the type-specific action (issue/transfer
   * stock) and marks the request COMPLETED — this is the hook the build
   * plan calls "on final approval, call the relevant execution service".
   */
  async approve(requestId: string, currentUser: SafeUser, comment?: string): Promise<RequestRecord> {
    const request = await this.findOneRaw(requestId);
    if (!request.workflowInstanceId) {
      throw new BadRequestException('This request has not been submitted yet');
    }

    // A final approval can succeed while execution later fails (for example,
    // because stock is temporarily insufficient). Allow the same endpoint to
    // retry execution; MovementService's execution keys make that safe even
    // if the movement committed but the final status update did not.
    if (request.status === 'APPROVED') {
      return this.execute(request, currentUser);
    }
    if (request.status === 'COMPLETED') {
      return request;
    }

    const instance = await this.workflowEngineService.approve(
      request.workflowInstanceId,
      currentUser,
      comment,
    );

    if (instance.status !== 'APPROVED') {
      // Still mid-chain — just reflect that a step happened; status stays
      // PENDING_APPROVAL until the last step clears.
      return this.prisma.request.update({
        where: { id: request.id },
        data: { status: 'PENDING_APPROVAL' },
      });
    }

    const approved = await this.prisma.request.update({
      where: { id: request.id },
      data: { status: 'APPROVED' },
    });

    return this.execute(approved, currentUser);
  }

  async reject(requestId: string, currentUser: SafeUser, comment?: string): Promise<RequestRecord> {
    const request = await this.findOneRaw(requestId);
    if (!request.workflowInstanceId) {
      throw new BadRequestException('This request has not been submitted yet');
    }

    await this.workflowEngineService.reject(request.workflowInstanceId, currentUser, comment);

    return this.prisma.request.update({
      where: { id: request.id },
      data: { status: 'REJECTED' },
    });
  }

  async cancel(requestId: string, currentUser: SafeUser, comment?: string): Promise<RequestRecord> {
    const request = await this.findOneRaw(requestId);
    if (request.requesterId !== currentUser.id) {
      throw new ForbiddenException('Only the requester can cancel this request');
    }
    if (!['DRAFT', 'SUBMITTED', 'PENDING_APPROVAL'].includes(request.status)) {
      throw new BadRequestException(`Request is already ${request.status.toLowerCase()}`);
    }

    if (request.workflowInstanceId) {
      await this.workflowEngineService.cancel(request.workflowInstanceId, currentUser, comment);
    }

    return this.prisma.request.update({
      where: { id: request.id },
      data: { status: 'CANCELLED' },
    });
  }

  /** The requester's own requests, regardless of status. */
  async findMine(requester: SafeUser): Promise<RequestRecord[]> {
    return this.prisma.request.findMany({
      where: { requesterId: requester.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Every request — only meaningful for a GLOBAL-scoped user (e.g. an auditor/admin). */
  async findAll(currentUser: SafeUser): Promise<RequestRecord[]> {
    const accessibleOrgIds = await this.accessControlService.getAccessibleOrganizationIds(
      currentUser.id,
    );
    if (accessibleOrgIds === 'ALL') {
      return this.prisma.request.findMany({ orderBy: { createdAt: 'desc' } });
    }
    // Non-global users get the same view as findMine() for now — full
    // "requests I could approve, across the org" visibility is a
    // reasonable Phase 6+ enhancement once more request types exist.
    return this.findMine(currentUser);
  }

  async findOne(requestId: string, currentUser: SafeUser) {
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
      include: {
        workflowInstance: {
          include: {
            workflowTemplate: { include: { steps: { orderBy: { order: 'asc' } } } },
            history: { orderBy: { createdAt: 'asc' }, include: { actedBy: true } },
          },
        },
        requester: true,
      },
    });
    if (!request) {
      throw new NotFoundException(`Request ${requestId} not found`);
    }

    if (request.requesterId !== currentUser.id) {
      const accessibleOrgIds = await this.accessControlService.getAccessibleOrganizationIds(
        currentUser.id,
      );
      if (accessibleOrgIds !== 'ALL') {
        throw new ForbiddenException('You do not have access to this request');
      }
    }

    return request;
  }

  private async findOneRaw(requestId: string): Promise<RequestRecord> {
    const request = await this.prisma.request.findUnique({ where: { id: requestId } });
    if (!request) {
      throw new NotFoundException(`Request ${requestId} not found`);
    }
    return request;
  }

  private buildContextData(request: RequestRecord): Record<string, string> {
    const details = request.details as unknown as ItemRequestDetails & TransferRequestDetails;

    switch (request.type) {
      case 'ITEM_REQUEST':
        return {
          requesterOrganizationId: request.organizationId,
          targetStoreId: details.targetStoreId,
        };
      case 'TRANSFER_REQUEST':
        return {
          requesterOrganizationId: request.organizationId,
          sourceStoreId: details.sourceStoreId,
          destinationStoreId: details.destinationStoreId,
        };
      case 'PURCHASE_REQUEST':
        return { requesterOrganizationId: request.organizationId };
      default:
        throw new BadRequestException(
          `Request type ${request.type} isn't submittable yet — its workflow template/execution isn't implemented in this phase`,
        );
    }
  }

  /** The "on final approval, call the relevant execution service" hook. */
  private async execute(request: RequestRecord, currentUser: SafeUser): Promise<RequestRecord> {
    const details = request.details as unknown as ItemRequestDetails & TransferRequestDetails;

    if (request.type === 'PURCHASE_REQUEST') {
      // Approval authorizes procurement to create one or more purchase
      // orders. Physical receiving is a later, explicit inventory action.
      return request;
    }
    if (request.type === 'ITEM_REQUEST') {
      await this.movementService.applyMovement({
        itemId: details.itemId,
        storeId: details.targetStoreId,
        quantity: details.quantity,
        movementType: 'ISSUE',
        referenceId: request.id,
        currentUser,
        authorizedByWorkflow: true,
        executionKey: `request:${request.id}:issue`,
      });
    } else if (request.type === 'TRANSFER_REQUEST') {
      await this.movementService.applyTransfer({
        itemId: details.itemId,
        fromStoreId: details.sourceStoreId,
        toStoreId: details.destinationStoreId,
        quantity: details.quantity,
        referenceId: request.id,
        currentUser,
        authorizedByWorkflow: true,
        executionKey: `request:${request.id}:transfer`,
      });
    }

    return this.prisma.request.update({
      where: { id: request.id },
      data: { status: 'COMPLETED' },
    });
  }

  private async assertItemExists(itemId: string): Promise<void> {
    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException(`Item ${itemId} not found`);
  }

  private async assertStoreExists(storeId: string): Promise<void> {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException(`Store ${storeId} not found`);
  }
}
