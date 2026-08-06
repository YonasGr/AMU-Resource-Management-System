import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SafeUser } from '../auth/decorators/current-user.decorator';
import { MovementService } from '../inventory/movement.service';
import { AccessControlService } from '../rbac/access-control.service';
import { CreateDistributionPlanDto } from './dto/create-distribution-plan.dto';
import { NotificationService } from '../notification/notification.service';


@Injectable()
export class DistributionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly movements: MovementService,
    private readonly access: AccessControlService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(dto: CreateDistributionPlanDto, currentUser: SafeUser) {
    const keys = dto.allocations.map((line) => `${line.itemId}:${line.destinationStoreId}`);
    if (new Set(keys).size !== keys.length) {
      throw new BadRequestException('Each item/destination pair may appear only once');
    }
    if (dto.allocations.some((line) => line.destinationStoreId === dto.sourceStoreId)) {
      throw new BadRequestException('Distribution destination must differ from the source store');
    }
    const storeIds = Array.from(new Set([
      dto.sourceStoreId, ...dto.allocations.map((line) => line.destinationStoreId),
    ]));
    const itemIds = Array.from(new Set(dto.allocations.map((line) => line.itemId)));
    const [stores, itemCount] = await Promise.all([
      this.prisma.store.findMany({ where: { id: { in: storeIds }, status: 'ACTIVE' } }),
      this.prisma.item.count({ where: { id: { in: itemIds }, status: 'ACTIVE' } }),
    ]);
    if (stores.length !== storeIds.length) throw new BadRequestException('Every distribution store must be active');
    if (itemCount !== itemIds.length) throw new BadRequestException('Every distributed item must be active');

    return this.prisma.distributionPlan.create({
      data: {
        planNumber: dto.planNumber,
        sourceStoreId: dto.sourceStoreId,
        notes: dto.notes,
        createdById: currentUser.id,
        allocations: { create: dto.allocations },
      },
      include: { sourceStore: true, allocations: { include: { item: true, destinationStore: true } } },
    });
  }

  findAll() {
    return this.prisma.distributionPlan.findMany({
      include: { sourceStore: true, allocations: { include: { item: true, destinationStore: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.distributionPlan.findUnique({
      where: { id },
      include: { sourceStore: true, allocations: { include: { item: true, destinationStore: true, confirmedBy: true } } },
    });
    if (!plan) throw new NotFoundException(`Distribution plan ${id} not found`);
    return plan;
  }

  async activate(id: string) {
    const plan = await this.findOne(id);
    if (plan.status !== 'DRAFT') throw new BadRequestException('Only draft plans can be activated');
    const totals = new Map<string, number>();
    for (const line of plan.allocations) {
      totals.set(line.itemId, (totals.get(line.itemId) ?? 0) + line.quantity);
    }
    const inventory = await this.prisma.storeInventory.findMany({
      where: { storeId: plan.sourceStoreId, itemId: { in: Array.from(totals.keys()) } },
    });
    const available = new Map(inventory.map((row) => [row.itemId, row.quantity]));
    for (const [itemId, quantity] of totals) {
      if ((available.get(itemId) ?? 0) < quantity) {
        throw new BadRequestException(`Insufficient source stock for item ${itemId}`);
      }
    }
    return this.prisma.distributionPlan.update({ where: { id }, data: { status: 'ACTIVE' } });
  }

  async confirm(allocationId: string, currentUser: SafeUser) {
    const allocation = await this.prisma.distributionAllocation.findUnique({
      where: { id: allocationId },
      include: { distributionPlan: true, destinationStore: true },
    });
    if (!allocation) throw new NotFoundException(`Distribution allocation ${allocationId} not found`);
    if (allocation.status === 'CONFIRMED') return allocation;
    if (allocation.distributionPlan.status !== 'ACTIVE') {
      throw new BadRequestException('Distribution plan is not active');
    }
    const allowed = await this.access.hasScopeAccess(currentUser.id, {
      type: 'STORE',
      storeId: allocation.destinationStoreId,
      storeOrganizationId: allocation.destinationStore.organizationId,
    });
    if (!allowed) throw new ForbiddenException('Only a user with destination-store scope can confirm receipt');

    await this.movements.applyTransfer({
      itemId: allocation.itemId,
      fromStoreId: allocation.distributionPlan.sourceStoreId,
      toStoreId: allocation.destinationStoreId,
      quantity: allocation.quantity,
      referenceId: allocation.distributionPlanId,
      currentUser,
      authorizedByWorkflow: true,
      executionKey: `distribution-allocation:${allocation.id}`,
    });

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.distributionAllocation.updateMany({
        where: { id: allocation.id, status: 'PENDING' },
        data: { status: 'CONFIRMED', confirmedAt: new Date(), confirmedById: currentUser.id },
      });
      const remaining = await tx.distributionAllocation.count({
        where: { distributionPlanId: allocation.distributionPlanId, status: 'PENDING' },
      });
      if (remaining === 0) {
        await tx.distributionPlan.update({
          where: { id: allocation.distributionPlanId }, data: { status: 'COMPLETED' },
        });
      }
      return tx.distributionAllocation.findUniqueOrThrow({
        where: { id: allocation.id }, include: { item: true, destinationStore: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    // Notify the plan creator of this allocation confirmation
    setImmediate(async () => {
      try {
        const plan = await this.prisma.distributionPlan.findUnique({
          where: { id: allocation.distributionPlanId },
          select: { createdById: true, planNumber: true },
        });
        if (plan) {
          await this.notificationService.notify(
            [plan.createdById],
            'DISTRIBUTION_CONFIRMED',
            'Distribution Allocation Confirmed',
            `An allocation in plan ${plan.planNumber} has been confirmed.`,
            'DistributionPlan',
            allocation.distributionPlanId,
          );
        }
      } catch { /* non-blocking */ }
    });

    return result;
  }

  async cancel(id: string) {
    const plan = await this.findOne(id);
    if (plan.allocations.some((line) => line.status === 'CONFIRMED')) {
      throw new BadRequestException('A distribution with confirmed receipts cannot be cancelled');
    }
    return this.prisma.distributionPlan.update({ where: { id }, data: { status: 'CANCELLED' } });
  }
}
