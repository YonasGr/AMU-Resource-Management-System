import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkflowInstance, WorkflowStepTemplate } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AccessControlService } from '../rbac/access-control.service';
import { SafeUser } from '../auth/decorators/current-user.decorator';
import { CreateWorkflowInstanceDto } from './dto/create-instance.dto';
import { NotificationService } from '../notification/notification.service';


type ContextData = Record<string, string>;

/**
 * Runs configurable multi-step approval chains. Phase 5+ modules (Request,
 * Transfer, Purchase, Disposal, Borrow) call createInstance() when their
 * record needs approval, then check getPendingStep()/approve()/reject() as
 * the chain progresses — none of them implement their own approval logic.
 */
@Injectable()
export class WorkflowEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControlService: AccessControlService,
    private readonly notificationService: NotificationService,
  ) {}

  async createInstance(
    dto: CreateWorkflowInstanceDto,
    createdById: string,
  ): Promise<WorkflowInstance> {
    const template = await this.prisma.workflowTemplate.findUnique({
      where: { code: dto.templateCode },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
    if (!template || !template.isActive) {
      throw new NotFoundException(`No active workflow template with code "${dto.templateCode}"`);
    }
    if (template.steps.length === 0) {
      throw new BadRequestException(`Workflow template "${dto.templateCode}" has no steps`);
    }

    const existingActive = await this.prisma.workflowInstance.findFirst({
      where: { entityType: dto.entityType, entityId: dto.entityId, status: 'PENDING' },
    });
    if (existingActive) {
      throw new BadRequestException(
        `An active workflow already exists for ${dto.entityType}:${dto.entityId}`,
      );
    }

    return this.prisma.workflowInstance.create({
      data: {
        workflowTemplateId: template.id,
        entityType: dto.entityType,
        entityId: dto.entityId,
        currentStepOrder: template.steps[0].order,
        contextData: dto.contextData,
        createdById,
      },
    });
  }

  async getInstance(id: string) {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id },
      include: {
        workflowTemplate: { include: { steps: { orderBy: { order: 'asc' } } } },
        history: { orderBy: { createdAt: 'asc' }, include: { actedBy: true } },
        createdBy: true,
      },
    });
    if (!instance) {
      throw new NotFoundException(`Workflow instance ${id} not found`);
    }
    return instance;
  }

  async getInstanceForEntity(entityType: string, entityId: string) {
    const instance = await this.prisma.workflowInstance.findFirst({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      include: {
        workflowTemplate: { include: { steps: { orderBy: { order: 'asc' } } } },
        history: { orderBy: { createdAt: 'asc' }, include: { actedBy: true } },
      },
    });
    if (!instance) {
      throw new NotFoundException(`No workflow instance found for ${entityType}:${entityId}`);
    }
    return instance;
  }

  async listTemplates() {
    return this.prisma.workflowTemplate.findMany({
      include: { steps: { orderBy: { order: 'asc' } } },
      orderBy: { code: 'asc' },
    });
  }

  /**
   * All PENDING instances where the given user is an eligible approver for
   * the CURRENT step specifically (not just any step). Powers the "pending
   * approvals inbox" — checks every pending instance's current step, so it
   * scales linearly with open approvals rather than total workflow volume,
   * which is fine at this system's scale.
   */
  async getMyPendingApprovals(userId: string) {
    const pendingInstances = await this.prisma.workflowInstance.findMany({
      where: { status: 'PENDING' },
      include: {
        workflowTemplate: { include: { steps: { orderBy: { order: 'asc' } } } },
        createdBy: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const eligible = [];
    for (const instance of pendingInstances) {
      const currentStep = instance.workflowTemplate.steps.find(
        (s) => s.order === instance.currentStepOrder,
      );
      if (!currentStep) continue;

      try {
        const canAct = await this.canUserActOnStep(
          userId,
          currentStep,
          instance.contextData as ContextData,
        );
        if (canAct) {
          let requestDetails: any = null;
          if (instance.entityId) {
            const req = await this.prisma.request.findUnique({
              where: { id: instance.entityId },
              include: { organization: { select: { name: true } } },
            });
            if (req) {
              const details = req.details as any;
              let itemsSummary: Array<{ name: string; quantity: number; unit?: string }> = [];
              let sourceStoreName: string | undefined;
              let destinationStoreName: string | undefined;
              let targetStoreName: string | undefined;
              let assetInfo: string | undefined;

              if (req.type === 'PURCHASE_REQUEST' && Array.isArray(details?.lines)) {
                const itemIds = details.lines.map((l: any) => l.itemId).filter(Boolean);
                const itemsList = await this.prisma.item.findMany({
                  where: { id: { in: itemIds } },
                  select: { id: true, name: true, unit: true },
                });
                const itemMap = new Map(itemsList.map((i) => [i.id, i]));
                itemsSummary = details.lines.map((l: any) => ({
                  name: itemMap.get(l.itemId)?.name || 'Unknown Item',
                  quantity: l.quantity,
                  unit: itemMap.get(l.itemId)?.unit,
                }));
              } else if (['ITEM_REQUEST', 'TRANSFER_REQUEST'].includes(req.type) && details?.itemId) {
                const item = await this.prisma.item.findUnique({
                  where: { id: details.itemId },
                  select: { name: true, unit: true },
                });
                if (item) {
                  itemsSummary = [{ name: item.name, quantity: details.quantity, unit: item.unit }];
                }
              }

              if (details?.targetStoreId) {
                const s = await this.prisma.store.findUnique({ where: { id: details.targetStoreId }, select: { name: true } });
                targetStoreName = s?.name;
              }
              if (details?.sourceStoreId) {
                const s = await this.prisma.store.findUnique({ where: { id: details.sourceStoreId }, select: { name: true } });
                sourceStoreName = s?.name;
              }
              if (details?.destinationStoreId) {
                const s = await this.prisma.store.findUnique({ where: { id: details.destinationStoreId }, select: { name: true } });
                destinationStoreName = s?.name;
              }
              if (details?.assetId) {
                const a = await this.prisma.asset.findUnique({
                  where: { id: details.assetId },
                  select: { assetTag: true, item: { select: { name: true } } },
                });
                if (a) assetInfo = `${a.assetTag} (${a.item.name})`;
              }

              requestDetails = {
                id: req.id,
                type: req.type,
                notes: details?.notes || details?.purpose || details?.reason,
                items: itemsSummary,
                targetStoreName,
                sourceStoreName,
                destinationStoreName,
                assetInfo,
                organizationName: req.organization?.name,
              };
            }
          }

          eligible.push({ ...instance, currentStep, requestDetails });
        }
      } catch {
        // A single instance with malformed contextData shouldn't break the inbox — skip it.
        continue;
      }
    }
    return eligible;
  }

  /**
   * History of all approval/rejection decisions recorded by the current user.
   */
  async getMyApprovalHistory(userId: string) {
    const history = await this.prisma.approvalHistory.findMany({
      where: { actedById: userId },
      include: {
        workflowInstance: {
          include: {
            workflowTemplate: true,
            createdBy: { select: { fullName: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const result = [];
    for (const h of history) {
      let requestDetails: any = null;
      if (h.workflowInstance?.entityId) {
        const req = await this.prisma.request.findUnique({
          where: { id: h.workflowInstance.entityId },
          select: { id: true, type: true, status: true },
        });
        if (req) {
          requestDetails = req;
        }
      }
      result.push({
        ...h,
        requestDetails,
      });
    }
    return result;
  }

  async approve(instanceId: string, currentUser: SafeUser, comment?: string) {
    const instance = await this.getInstance(instanceId);
    if (instance.status !== 'PENDING') {
      throw new BadRequestException(`Workflow is already ${instance.status.toLowerCase()}`);
    }

    const steps = instance.workflowTemplate.steps;
    const currentStep = steps.find((s) => s.order === instance.currentStepOrder);
    if (!currentStep) {
      throw new BadRequestException('No step found at the current order — template may have changed');
    }

    const eligible = await this.canUserActOnStep(currentUser.id, currentStep, instance.contextData as ContextData);
    if (!eligible) {
      throw new ForbiddenException(
        `You are not an eligible approver for step "${currentStep.name}"`,
      );
    }

    const nextStep = steps.find((s) => s.order > instance.currentStepOrder);

    return this.prisma.$transaction(async (tx) => {
      // Claim this exact pending step before recording its history. Without
      // this conditional update, two near-simultaneous approvals can both
      // read the same step and write duplicate history entries.
      const claimed = await tx.workflowInstance.updateMany({
        where: {
          id: instance.id,
          status: 'PENDING',
          currentStepOrder: instance.currentStepOrder,
        },
        data: nextStep
          ? { currentStepOrder: nextStep.order }
          : { status: 'APPROVED' },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException('This workflow step has already been acted on');
      }

      await tx.approvalHistory.create({
        data: {
          workflowInstanceId: instance.id,
          stepOrder: currentStep.order,
          action: 'APPROVED',
          comment,
          actedById: currentUser.id,
        },
      });

      const updated = await tx.workflowInstance.findUniqueOrThrow({
        where: { id: instance.id },
      });

      // Notify after the transaction commits — fire and forget (non-blocking)
      setImmediate(async () => {
        try {
          const req = await this.prisma.request.findFirst({
            where: { workflowInstanceId: instance.id },
            select: { id: true, requesterId: true, type: true },
          });
          if (updated.status === 'APPROVED') {
            // Final approval — notify the requester
            if (req) {
              await this.notificationService.notify(
                [req.requesterId],
                'REQUEST_APPROVED',
                'Request Approved',
                `Your ${req.type.replace(/_/g, ' ').toLowerCase()} has been approved.`,
                req.type,
                req.id,
              );
            }
          } else if (nextStep) {
            // Advance to next step — notify eligible approvers
            await this.notifyEligibleApprovers(instance.id, nextStep, instance.contextData as ContextData, req?.type, req?.id);
          }
        } catch { /* non-blocking */ }
      });

      return updated;
    });
  }

  async reject(instanceId: string, currentUser: SafeUser, comment?: string) {
    const instance = await this.getInstance(instanceId);
    if (instance.status !== 'PENDING') {
      throw new BadRequestException(`Workflow is already ${instance.status.toLowerCase()}`);
    }

    const currentStep = instance.workflowTemplate.steps.find(
      (s) => s.order === instance.currentStepOrder,
    );
    if (!currentStep) {
      throw new BadRequestException('No step found at the current order — template may have changed');
    }

    const eligible = await this.canUserActOnStep(currentUser.id, currentStep, instance.contextData as ContextData);
    if (!eligible) {
      throw new ForbiddenException(
        `You are not an eligible approver for step "${currentStep.name}"`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.approvalHistory.create({
        data: {
          workflowInstanceId: instance.id,
          stepOrder: currentStep.order,
          action: 'REJECTED',
          comment,
          actedById: currentUser.id,
        },
      });

      const updated = await tx.workflowInstance.update({
        where: { id: instance.id },
        data: { status: 'REJECTED' },
      });

      setImmediate(async () => {
        try {
          const req = await this.prisma.request.findFirst({
            where: { workflowInstanceId: instance.id },
            select: { id: true, requesterId: true, type: true },
          });
          if (req) {
            await this.notificationService.notify(
              [req.requesterId],
              'REQUEST_REJECTED',
              'Request Rejected',
              `Your ${req.type.replace(/_/g, ' ').toLowerCase()} was rejected${comment ? `: ${comment}` : '.'}`,
              req.type,
              req.id,
            );
          }
        } catch { /* non-blocking */ }
      });

      return updated;
    });
  }

  /** Only the original requester can cancel their own pending workflow. */
  async cancel(instanceId: string, currentUser: SafeUser, comment?: string) {
    const instance = await this.getInstance(instanceId);
    if (instance.status !== 'PENDING') {
      throw new BadRequestException(`Workflow is already ${instance.status.toLowerCase()}`);
    }
    if (instance.createdById !== currentUser.id) {
      throw new ForbiddenException('Only the requester can cancel this workflow');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.approvalHistory.create({
        data: {
          workflowInstanceId: instance.id,
          stepOrder: instance.currentStepOrder,
          action: 'CANCELLED',
          comment,
          actedById: currentUser.id,
        },
      });
      return tx.workflowInstance.update({
        where: { id: instance.id },
        data: { status: 'CANCELLED' },
      });
    });
  }

  /**
   * The approver-resolution logic: given a step's configured strategy, does
   * this user qualify? Reuses AccessControlService's role+scope helpers
   * rather than reimplementing scope-walking here.
   */
  private async canUserActOnStep(
    userId: string,
    step: WorkflowStepTemplate,
    contextData: ContextData,
  ): Promise<boolean> {
    const isGlobalAdmin = await this.accessControlService.userHasRole(
      userId,
      'SYSTEM_ADMINISTRATOR',
    );
    if (isGlobalAdmin) return true;

    switch (step.approverResolutionType) {
      case 'FIXED_ROLE':
        return this.accessControlService.userHasRole(userId, step.roleCode!);

      case 'ORG_ROLE_AT_CONTEXT_ORG': {
        const orgId = contextData[step.contextOrgKey!];
        if (!orgId) {
          throw new BadRequestException(
            `Missing "${step.contextOrgKey}" in contextData for step "${step.name}"`,
          );
        }
        return this.accessControlService.userHasRoleAtOrgScope(userId, step.roleCode!, orgId);
      }

      case 'ORG_ROLE_AT_NEXT_LEVEL_UP': {
        const orgId = contextData[step.contextOrgKey!];
        if (!orgId) {
          throw new BadRequestException(
            `Missing "${step.contextOrgKey}" in contextData for step "${step.name}"`,
          );
        }
        return this.accessControlService.userHasRoleAtParentOrgScope(
          userId,
          step.roleCode!,
          orgId,
        );
      }

      case 'STORE_ROLE_AT_CONTEXT_STORE': {
        const storeId = contextData[step.contextStoreKey!];
        if (!storeId) {
          throw new BadRequestException(
            `Missing "${step.contextStoreKey}" in contextData for step "${step.name}"`,
          );
        }
        const store = await this.prisma.store.findUnique({ where: { id: storeId } });
        if (!store) {
          throw new NotFoundException(`Store ${storeId} not found`);
        }
        return this.accessControlService.userHasRoleAtStoreScope(
          userId,
          step.roleCode!,
          storeId,
          store.organizationId,
        );
      }

      default:
        return false;
    }
  }

  /**
   * Finds all users eligible for a given workflow step and sends them an
   * APPROVAL_REQUIRED notification. Scans the full UserRole table using the
   * same role+scope resolution logic as canUserActOnStep, but in reverse:
   * starting from the role and scope, collecting matching user IDs.
   */
  private async notifyEligibleApprovers(
    instanceId: string,
    step: WorkflowStepTemplate,
    contextData: ContextData,
    entityType?: string,
    entityId?: string,
  ): Promise<void> {
    if (!step.roleCode) return;

    const userRoles = await this.prisma.userRole.findMany({
      where: { role: { code: step.roleCode } },
      select: { userId: true, scopeType: true, scopeId: true },
    });

    const userIds = new Set<string>();
    for (const ur of userRoles) {
      if (ur.scopeType === 'GLOBAL') {
        userIds.add(ur.userId);
        continue;
      }
      if (step.approverResolutionType === 'FIXED_ROLE') {
        userIds.add(ur.userId);
        continue;
      }
      if (step.approverResolutionType === 'ORG_ROLE_AT_CONTEXT_ORG' && step.contextOrgKey) {
        const orgId = contextData[step.contextOrgKey];
        if (orgId && ur.scopeId === orgId) {
          userIds.add(ur.userId);
        }
      }
      if (step.approverResolutionType === 'STORE_ROLE_AT_CONTEXT_STORE' && step.contextStoreKey) {
        const storeId = contextData[step.contextStoreKey];
        if (storeId && ur.scopeId === storeId) {
          userIds.add(ur.userId);
        }
      }
    }

    if (userIds.size === 0) return;

    await this.notificationService.notify(
      Array.from(userIds),
      'APPROVAL_REQUIRED',
      `Approval Required: ${step.name}`,
      `You have a pending approval for step "${step.name}".`,
      entityType,
      entityId,
    );
  }
}
