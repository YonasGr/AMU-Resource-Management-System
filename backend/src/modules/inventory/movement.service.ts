import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryMovement, MovementType, Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AccessControlService } from '../rbac/access-control.service';
import { SafeUser } from '../auth/decorators/current-user.decorator';

type TxClient = Prisma.TransactionClient;

interface SingleStoreMovementParams {
  itemId: string;
  storeId: string;
  quantity: number; // sign convention depends on movementType — see applyMovement below
  movementType: Extract<
    MovementType,
    'PURCHASE_RECEIVE' | 'ISSUE' | 'RETURN' | 'DISPOSAL' | 'ADJUSTMENT'
  >;
  referenceId?: string;
  currentUser: SafeUser;
}

interface TransferParams {
  itemId: string;
  fromStoreId: string;
  toStoreId: string;
  quantity: number;
  referenceId?: string;
  currentUser: SafeUser;
}

/**
 * The ONLY place in the codebase allowed to write to StoreInventory.quantity.
 * Every write happens inside a transaction alongside the InventoryMovement
 * row that justifies it — per the spec's core rule, there is no such thing
 * as a direct inventory change. Every other module (Transfer, Purchase,
 * Disposal, Borrowing — Phase 5+) must call applyMovement()/applyTransfer()
 * rather than touching StoreInventory itself.
 */
@Injectable()
export class MovementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControlService: AccessControlService,
  ) {}

  async applyMovement(params: SingleStoreMovementParams): Promise<InventoryMovement> {
    const { itemId, storeId, quantity, movementType, referenceId, currentUser } = params;

    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException(`Store ${storeId} not found`);
    }
    await this.assertItemExists(itemId);
    await this.assertStoreAccess(currentUser, store.id, store.organizationId);

    // Sign convention: PURCHASE_RECEIVE/RETURN always increase; ISSUE/DISPOSAL
    // always decrease; ADJUSTMENT is signed by the caller (positive or
    // negative) since it represents a manual correction in either direction.
    let delta: number;
    switch (movementType) {
      case 'PURCHASE_RECEIVE':
      case 'RETURN':
        if (quantity <= 0) throw new BadRequestException('Quantity must be positive');
        delta = quantity;
        break;
      case 'ISSUE':
      case 'DISPOSAL':
        if (quantity <= 0) throw new BadRequestException('Quantity must be positive');
        delta = -quantity;
        break;
      case 'ADJUSTMENT':
        if (quantity === 0) throw new BadRequestException('Adjustment quantity cannot be 0');
        delta = quantity;
        break;
      default:
        throw new BadRequestException(`${movementType} must go through applyTransfer()`);
    }

    const isReceivingType = movementType === 'PURCHASE_RECEIVE' || movementType === 'RETURN';
    const isIssuingType = movementType === 'ISSUE' || movementType === 'DISPOSAL';

    return this.prisma.$transaction(async (tx) => {
      await this.adjustStoreInventory(tx, storeId, itemId, delta);

      return tx.inventoryMovement.create({
        data: {
          itemId,
          quantity: movementType === 'ADJUSTMENT' ? quantity : Math.abs(quantity),
          movementType,
          referenceId,
          // Receiving-type movements land AT this store (toStore); issuing-type
          // movements leave FROM this store (fromStore); an adjustment is
          // recorded against the store it targets, using toStoreId as "the
          // store this row is about" since there's no second side involved.
          toStoreId: isReceivingType || movementType === 'ADJUSTMENT' ? storeId : null,
          fromStoreId: isIssuingType ? storeId : null,
          createdById: currentUser.id,
        },
      });
    });
  }

  /**
   * Atomically moves stock between two stores, writing a TRANSFER_OUT row
   * (from the source store's perspective) and a TRANSFER_IN row (from the
   * destination's) sharing one referenceId — generated if the caller doesn't
   * supply one — so the two sides can always be correlated later.
   */
  async applyTransfer(params: TransferParams): Promise<{
    transferOut: InventoryMovement;
    transferIn: InventoryMovement;
  }> {
    const { itemId, fromStoreId, toStoreId, quantity, currentUser } = params;

    if (fromStoreId === toStoreId) {
      throw new BadRequestException('fromStoreId and toStoreId must be different stores');
    }
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be positive');
    }

    const [fromStore, toStore] = await Promise.all([
      this.prisma.store.findUnique({ where: { id: fromStoreId } }),
      this.prisma.store.findUnique({ where: { id: toStoreId } }),
    ]);
    if (!fromStore) throw new NotFoundException(`Store ${fromStoreId} not found`);
    if (!toStore) throw new NotFoundException(`Store ${toStoreId} not found`);
    await this.assertItemExists(itemId);

    // Both sides need scope access — a transfer touches two stores, and a
    // user might manage one but not the other.
    await this.assertStoreAccess(currentUser, fromStore.id, fromStore.organizationId);
    await this.assertStoreAccess(currentUser, toStore.id, toStore.organizationId);

    const referenceId = params.referenceId ?? crypto.randomUUID();

    return this.prisma.$transaction(async (tx) => {
      await this.adjustStoreInventory(tx, fromStoreId, itemId, -quantity);
      await this.adjustStoreInventory(tx, toStoreId, itemId, quantity);

      const transferOut = await tx.inventoryMovement.create({
        data: {
          itemId,
          quantity,
          movementType: 'TRANSFER_OUT',
          referenceId,
          fromStoreId,
          toStoreId,
          createdById: currentUser.id,
        },
      });
      const transferIn = await tx.inventoryMovement.create({
        data: {
          itemId,
          quantity,
          movementType: 'TRANSFER_IN',
          referenceId,
          fromStoreId,
          toStoreId,
          createdById: currentUser.id,
        },
      });

      return { transferOut, transferIn };
    });
  }

  async getMovementHistory(
    currentUser: SafeUser,
    filter?: { storeId?: string; itemId?: string },
  ): Promise<InventoryMovement[]> {
    const accessibleOrgIds = await this.accessControlService.getAccessibleOrganizationIds(
      currentUser.id,
    );
    const accessibleStoreIds = await this.accessControlService.getAccessibleStoreIds(
      currentUser.id,
    );

    const where: Prisma.InventoryMovementWhereInput = {
      itemId: filter?.itemId,
    };

    if (filter?.storeId) {
      where.OR = [{ fromStoreId: filter.storeId }, { toStoreId: filter.storeId }];
    }

    if (accessibleOrgIds !== 'ALL') {
      // Restrict to movements touching a store the user can actually see.
      const visibleStores = await this.prisma.store.findMany({
        where: {
          OR: [
            { organizationId: { in: Array.from(accessibleOrgIds) } },
            { id: { in: Array.from(accessibleStoreIds) } },
          ],
        },
        select: { id: true },
      });
      const visibleIds = visibleStores.map((s) => s.id);
      const scopeFilter: Prisma.InventoryMovementWhereInput = {
        OR: [{ fromStoreId: { in: visibleIds } }, { toStoreId: { in: visibleIds } }],
      };
      where.AND = where.OR ? [{ OR: where.OR }, scopeFilter] : [scopeFilter];
      delete where.OR;
    }

    return this.prisma.inventoryMovement.findMany({
      where,
      include: { item: true, fromStore: true, toStore: true, createdBy: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async assertItemExists(itemId: string): Promise<void> {
    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item) {
      throw new NotFoundException(`Item ${itemId} not found`);
    }
  }

  private async assertStoreAccess(
    currentUser: SafeUser,
    storeId: string,
    storeOrganizationId: string,
  ): Promise<void> {
    const allowed = await this.accessControlService.hasScopeAccess(currentUser.id, {
      type: 'STORE',
      storeId,
      storeOrganizationId,
    });
    if (!allowed) {
      throw new ForbiddenException('You do not have access to this store');
    }
  }

  /**
   * The only function in the codebase that writes to StoreInventory.quantity.
   * Always called from inside a $transaction alongside the movement row.
   */
  private async adjustStoreInventory(
    tx: TxClient,
    storeId: string,
    itemId: string,
    delta: number,
  ): Promise<void> {
    if (delta < 0) {
      const existing = await tx.storeInventory.findUnique({
        where: { storeId_itemId: { storeId, itemId } },
      });
      if (!existing || existing.quantity + delta < 0) {
        throw new BadRequestException(
          `Insufficient stock: store has ${existing?.quantity ?? 0}, tried to remove ${-delta}`,
        );
      }
      await tx.storeInventory.update({
        where: { storeId_itemId: { storeId, itemId } },
        data: { quantity: { increment: delta } },
      });
    } else {
      await tx.storeInventory.upsert({
        where: { storeId_itemId: { storeId, itemId } },
        update: { quantity: { increment: delta } },
        create: { storeId, itemId, quantity: delta },
      });
    }
  }
}
