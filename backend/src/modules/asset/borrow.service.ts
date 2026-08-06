import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AssetCondition, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SafeUser } from '../auth/decorators/current-user.decorator';
import { MovementService } from '../inventory/movement.service';
import { AccessControlService } from '../rbac/access-control.service';
import { NotificationService } from '../notification/notification.service';


@Injectable()
export class BorrowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly movements: MovementService,
    private readonly access: AccessControlService,
    private readonly notificationService: NotificationService,
  ) {}

  async findAll(user: SafeUser, status?: string) {
    const orgIds = await this.access.getAccessibleOrganizationIds(user.id);
    const storeIds = await this.access.getAccessibleStoreIds(user.id);
    const scope = orgIds === 'ALL' ? {} : {
      OR: [{ storeId: { in: [...storeIds] } }, { store: { organizationId: { in: [...orgIds] } } }, { borrowerId: user.id }],
    };
    return this.prisma.borrowTransaction.findMany({
      where: { ...scope, status: status as any },
      include: { asset: { include: { item: true } }, store: true, borrower: true, request: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async issue(id: string, notes: string | undefined, user: SafeUser) {
    const result = await this.prisma.$transaction(async (tx) => {
      const loan = await tx.borrowTransaction.findUnique({ where: { id }, include: { asset: true, store: true } });
      if (!loan) throw new NotFoundException(`Borrow transaction ${id} not found`);
      await this.assertStoreScope(user.id, loan.storeId, loan.store.organizationId);
      if (loan.status === 'ISSUED') return loan;
      if (loan.status !== 'APPROVED') throw new BadRequestException(`Only approved borrowing can be issued`);
      if (!['AVAILABLE', 'ASSIGNED'].includes(loan.asset.status)) throw new BadRequestException('Asset is no longer available');
      const claimed = await tx.borrowTransaction.updateMany({ where: { id, status: 'APPROVED' }, data: { status: 'ISSUED', issuedAt: new Date(), issuedById: user.id, issueNotes: notes } });
      if (claimed.count !== 1) throw new BadRequestException('Borrowing was already processed');
      await this.movements.applyMovement({
        itemId: loan.asset.itemId, storeId: loan.storeId, quantity: 1, movementType: 'ISSUE',
        referenceId: loan.requestId, executionKey: `borrow:${loan.id}:issue`, currentUser: user, transaction: tx,
      });
      await tx.asset.update({ where: { id: loan.assetId }, data: { status: 'BORROWED' } });
      await tx.assetHistory.create({ data: { assetId: loan.assetId, actedById: user.id, eventType: 'BORROW_ISSUED', details: { borrowTransactionId: loan.id } } });
      await tx.request.update({ where: { id: loan.requestId }, data: { status: 'COMPLETED' } });
      return tx.borrowTransaction.findUniqueOrThrow({ where: { id }, include: { asset: { include: { item: true } }, borrower: true, store: true } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    setImmediate(async () => {
      try {
        const loan = await this.prisma.borrowTransaction.findUnique({
          where: { id },
          select: { borrowerId: true, asset: { select: { assetTag: true } } },
        });
        if (loan) {
          await this.notificationService.notify(
            [loan.borrowerId],
            'BORROW_ISSUED',
            'Asset Issued',
            `Asset ${loan.asset.assetTag} has been issued to you.`,
            'BorrowTransaction',
            id,
          );
        }
      } catch { /* non-blocking */ }
    });

    return result;
  }

  async returnAsset(id: string, notes: string | undefined, user: SafeUser) {
    const returnResult = await this.prisma.$transaction(async (tx) => {
      const loan = await tx.borrowTransaction.findUnique({ where: { id }, include: { asset: true, store: true } });
      if (!loan) throw new NotFoundException(`Borrow transaction ${id} not found`);
      if (loan.borrowerId !== user.id) await this.assertStoreScope(user.id, loan.storeId, loan.store.organizationId);
      if (loan.status === 'RETURNED_PENDING_INSPECTION') return loan;
      if (loan.status !== 'ISSUED') throw new BadRequestException('Only issued assets can be returned');
      const claimed = await tx.borrowTransaction.updateMany({
        where: { id, status: 'ISSUED' },
        data: { status: 'RETURNED_PENDING_INSPECTION', returnedAt: new Date(), returnedById: user.id, returnNotes: notes },
      });
      if (claimed.count !== 1) throw new BadRequestException('Borrowing was already processed');
      await this.movements.applyMovement({
        itemId: loan.asset.itemId, storeId: loan.storeId, quantity: 1, movementType: 'RETURN',
        referenceId: loan.requestId, executionKey: `borrow:${loan.id}:return`, currentUser: user,
        authorizedByWorkflow: loan.borrowerId === user.id, transaction: tx,
      });
      await tx.asset.update({ where: { id: loan.assetId }, data: { status: 'UNDER_INSPECTION' } });
      await tx.assetHistory.create({ data: { assetId: loan.assetId, actedById: user.id, eventType: 'BORROW_RETURNED', details: { borrowTransactionId: loan.id } } });
      return tx.borrowTransaction.findUniqueOrThrow({ where: { id }, include: { asset: { include: { item: true } }, borrower: true, store: true } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    setImmediate(async () => {
      try {
        const loan = await this.prisma.borrowTransaction.findUnique({
          where: { id },
          select: { store: { select: { managerId: true } }, asset: { select: { assetTag: true } } },
        });
        if (loan?.store.managerId) {
          await this.notificationService.notify(
            [loan.store.managerId],
            'BORROW_RETURNED',
            'Asset Returned',
            `Asset ${loan.asset.assetTag} has been returned and is pending inspection.`,
            'BorrowTransaction',
            id,
          );
        }
      } catch { /* non-blocking */ }
    });

    return returnResult;
  }

  async inspect(id: string, condition: AssetCondition, notes: string, user: SafeUser) {
    return this.prisma.$transaction(async (tx) => {
      const loan = await tx.borrowTransaction.findUnique({ where: { id }, include: { asset: true, store: true } });
      if (!loan) throw new NotFoundException(`Borrow transaction ${id} not found`);
      await this.assertStoreScope(user.id, loan.storeId, loan.store.organizationId);
      if (loan.status === 'COMPLETED') return loan;
      if (loan.status !== 'RETURNED_PENDING_INSPECTION') throw new BadRequestException('Asset must be returned before inspection');
      const claimed = await tx.borrowTransaction.updateMany({
        where: { id, status: 'RETURNED_PENDING_INSPECTION' },
        data: { status: 'COMPLETED', inspectedAt: new Date(), inspectedById: user.id, inspectionNotes: notes, returnCondition: condition },
      });
      if (claimed.count !== 1) throw new BadRequestException('Borrowing was already inspected');
      const needsMaintenance = ['POOR', 'DAMAGED'].includes(condition);
      await tx.asset.update({
        where: { id: loan.assetId },
        data: { condition, status: needsMaintenance ? 'UNDER_MAINTENANCE' : (loan.asset.assignedOrganizationId ? 'ASSIGNED' : 'AVAILABLE') },
      });
      await tx.assetHistory.create({
        data: { assetId: loan.assetId, actedById: user.id, eventType: 'BORROW_INSPECTED', details: { borrowTransactionId: loan.id, condition, notes } },
      });
      return tx.borrowTransaction.findUniqueOrThrow({ where: { id }, include: { asset: { include: { item: true } }, borrower: true, store: true } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private async assertStoreScope(userId: string, storeId: string, organizationId: string) {
    if (!await this.access.hasScopeAccess(userId, { type: 'STORE', storeId, storeOrganizationId: organizationId })) {
      throw new ForbiddenException('You do not have access to this borrowing store');
    }
  }
}
