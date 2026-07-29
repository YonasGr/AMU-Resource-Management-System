import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StoreInventory } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AccessControlService } from '../rbac/access-control.service';
import { SafeUser } from '../auth/decorators/current-user.decorator';
import { SetMinimumStockDto } from './dto/set-minimum-stock.dto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControlService: AccessControlService,
  ) {}

  async getByStore(storeId: string, currentUser: SafeUser): Promise<StoreInventory[]> {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException(`Store ${storeId} not found`);
    }
    await this.assertStoreAccess(currentUser, store.id, store.organizationId);

    return this.prisma.storeInventory.findMany({
      where: { storeId },
      include: { item: true },
      orderBy: { item: { name: 'asc' } },
    });
  }

  /** Cross-store view of one item's quantities, scoped to stores the user can see. */
  async getByItem(itemId: string, currentUser: SafeUser): Promise<StoreInventory[]> {
    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item) {
      throw new NotFoundException(`Item ${itemId} not found`);
    }

    const accessibleOrgIds = await this.accessControlService.getAccessibleOrganizationIds(
      currentUser.id,
    );
    const accessibleStoreIds = await this.accessControlService.getAccessibleStoreIds(
      currentUser.id,
    );

    const where: Prisma.StoreInventoryWhereInput = { itemId };
    if (accessibleOrgIds !== 'ALL') {
      where.store = {
        OR: [
          { organizationId: { in: Array.from(accessibleOrgIds) } },
          { id: { in: Array.from(accessibleStoreIds) } },
        ],
      };
    }

    return this.prisma.storeInventory.findMany({
      where,
      include: { store: true },
      orderBy: { store: { name: 'asc' } },
    });
  }

  /** Rows where quantity has fallen to or below minimumStock, scoped to visible stores. */
  async getLowStock(currentUser: SafeUser, storeId?: string): Promise<StoreInventory[]> {
    const accessibleOrgIds = await this.accessControlService.getAccessibleOrganizationIds(
      currentUser.id,
    );
    const accessibleStoreIds = await this.accessControlService.getAccessibleStoreIds(
      currentUser.id,
    );

    const where: Prisma.StoreInventoryWhereInput = {
      storeId,
    };

    if (accessibleOrgIds !== 'ALL') {
      where.store = {
        OR: [
          { organizationId: { in: Array.from(accessibleOrgIds) } },
          { id: { in: Array.from(accessibleStoreIds) } },
        ],
      };
    }

    // Prisma can't compare two columns of the same row in a `where` filter
    // directly, so fetch candidates and filter in application code. Store
    // inventory tables are small enough per-store that this is fine; revisit
    // with a raw query if this ever needs to scale to huge catalogs.
    const rows = await this.prisma.storeInventory.findMany({
      where,
      include: { item: true, store: true },
    });
    return rows.filter((row) => row.quantity <= row.minimumStock);
  }

  async setMinimumStock(
    storeId: string,
    itemId: string,
    dto: SetMinimumStockDto,
    currentUser: SafeUser,
  ): Promise<StoreInventory> {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException(`Store ${storeId} not found`);
    }
    await this.assertStoreAccess(currentUser, store.id, store.organizationId);

    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item) {
      throw new NotFoundException(`Item ${itemId} not found`);
    }

    return this.prisma.storeInventory.upsert({
      where: { storeId_itemId: { storeId, itemId } },
      update: { minimumStock: dto.minimumStock },
      create: { storeId, itemId, quantity: 0, minimumStock: dto.minimumStock },
    });
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
}
