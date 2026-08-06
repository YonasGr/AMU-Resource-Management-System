import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SafeUser } from '../auth/decorators/current-user.decorator';
import { AccessControlService } from '../rbac/access-control.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@Injectable()
export class AssetService {
  constructor(private readonly prisma: PrismaService, private readonly access: AccessControlService) {}

  async create(dto: CreateAssetDto, user: SafeUser) {
    return this.prisma.$transaction(async (tx) => {
      const [item, store] = await Promise.all([
        tx.item.findUnique({ where: { id: dto.itemId } }),
        tx.store.findUnique({ where: { id: dto.storeId } }),
      ]);
      if (!item) throw new NotFoundException(`Item ${dto.itemId} not found`);
      if (!store) throw new NotFoundException(`Store ${dto.storeId} not found`);
      if (item.assetType !== 'FIXED_ASSET') throw new BadRequestException('Only fixed-asset catalog items can be registered as assets');
      if (item.serialRequired && !dto.serialNumber) throw new BadRequestException('A serial number is required for this item');
      await this.assertStoreScope(user.id, store.id, store.organizationId);

      if (dto.assignedOrganizationId) {
        const org = await tx.organizationUnit.findUnique({ where: { id: dto.assignedOrganizationId } });
        if (!org) throw new NotFoundException(`Organization ${dto.assignedOrganizationId} not found`);
      }
      if (dto.goodsReceiptLineId) {
        const receiptLine = await tx.goodsReceiptLine.findUnique({
          where: { id: dto.goodsReceiptLineId }, include: { goodsReceipt: true, _count: { select: { assets: true } } },
        });
        if (!receiptLine) throw new NotFoundException(`Goods receipt line ${dto.goodsReceiptLineId} not found`);
        if (receiptLine.itemId !== item.id || receiptLine.goodsReceipt.storeId !== store.id) {
          throw new BadRequestException('Receipt line item/store does not match this asset');
        }
        if (receiptLine._count.assets >= receiptLine.acceptedQuantity) {
          throw new BadRequestException('All accepted units on this receipt line are already registered');
        }
      } else {
        const [inventory, registered] = await Promise.all([
          tx.storeInventory.findUnique({ where: { storeId_itemId: { storeId: store.id, itemId: item.id } } }),
          tx.asset.count({ where: { storeId: store.id, itemId: item.id, status: { not: 'DISPOSED' } } }),
        ]);
        if (!inventory || registered >= inventory.quantity) {
          throw new BadRequestException('No unregistered inventory unit is available for this asset');
        }
      }

      const asset = await tx.asset.create({
        data: {
          assetTag: dto.assetTag.trim(),
          serialNumber: dto.serialNumber?.trim() || null,
          itemId: item.id,
          storeId: store.id,
          goodsReceiptLineId: dto.goodsReceiptLineId,
          assignedOrganizationId: dto.assignedOrganizationId,
          purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
          condition: dto.condition ?? 'GOOD',
          status: dto.assignedOrganizationId ? 'ASSIGNED' : 'AVAILABLE',
          notes: dto.notes,
          registeredById: user.id,
        },
      });
      await tx.assetHistory.create({
        data: { assetId: asset.id, actedById: user.id, eventType: 'REGISTERED', details: { goodsReceiptLineId: dto.goodsReceiptLineId ?? null } },
      });
      return asset;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async findAll(user: SafeUser, filter?: { storeId?: string; status?: string; itemId?: string; search?: string }) {
    const orgIds = await this.access.getAccessibleOrganizationIds(user.id);
    const storeIds = await this.access.getAccessibleStoreIds(user.id);
    const scope = orgIds === 'ALL' ? undefined : {
      OR: [{ storeId: { in: [...storeIds] } }, { store: { organizationId: { in: [...orgIds] } } }],
    };
    return this.prisma.asset.findMany({
      where: {
        AND: [
          ...(scope ? [scope] : []),
          ...(filter?.search ? [{ OR: [
            { assetTag: { contains: filter.search, mode: 'insensitive' as const } },
            { serialNumber: { contains: filter.search, mode: 'insensitive' as const } },
            { item: { name: { contains: filter.search, mode: 'insensitive' as const } } },
          ] }] : []),
        ],
        storeId: filter?.storeId,
        itemId: filter?.itemId,
        status: filter?.status as any,
      },
      include: { item: true, store: true, assignedOrganization: true, _count: { select: { borrowTransactions: true } } },
      orderBy: { assetTag: 'asc' },
    });
  }

  async findOne(id: string, user: SafeUser) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        item: true, store: true, assignedOrganization: true, goodsReceiptLine: { include: { goodsReceipt: true } },
        history: { include: { actedBy: true }, orderBy: { createdAt: 'desc' } },
        borrowTransactions: { include: { borrower: true }, orderBy: { createdAt: 'desc' } }, disposalRecord: true,
      },
    });
    if (!asset) throw new NotFoundException(`Asset ${id} not found`);
    await this.assertStoreScope(user.id, asset.storeId, asset.store.organizationId);
    return asset;
  }

  async update(id: string, dto: UpdateAssetDto, user: SafeUser) {
    const current = await this.findOne(id, user);
    if (current.status === 'DISPOSED') throw new BadRequestException('Disposed assets are immutable');
    if (dto.assignedOrganizationId) {
      const org = await this.prisma.organizationUnit.findUnique({ where: { id: dto.assignedOrganizationId } });
      if (!org) throw new NotFoundException(`Organization ${dto.assignedOrganizationId} not found`);
    }
    const asset = await this.prisma.asset.update({
      where: { id },
      data: {
        assignedOrganizationId: dto.assignedOrganizationId,
        condition: dto.condition,
        notes: dto.notes,
        status: dto.assignedOrganizationId && current.status === 'AVAILABLE' ? 'ASSIGNED' : undefined,
      },
    });
    await this.prisma.assetHistory.create({
      data: { assetId: id, actedById: user.id, eventType: 'UPDATED', details: dto as any },
    });
    return asset;
  }

  async completeMaintenance(id: string, user: SafeUser) {
    const asset = await this.findOne(id, user);
    if (asset.status !== 'UNDER_MAINTENANCE' && asset.status !== 'UNDER_INSPECTION') {
      throw new BadRequestException(`Asset ${id} is not under maintenance or inspection`);
    }
    const newStatus = asset.assignedOrganizationId ? 'ASSIGNED' : 'AVAILABLE';
    const updated = await this.prisma.asset.update({
      where: { id },
      data: { status: newStatus },
    });
    await this.prisma.assetHistory.create({
      data: {
        assetId: id,
        actedById: user.id,
        eventType: 'UPDATED',
        details: { action: 'MAINTENANCE_COMPLETED', previousStatus: asset.status, newStatus },
      },
    });
    return updated;
  }

  async unassign(id: string, user: SafeUser) {
    const asset = await this.findOne(id, user);
    if (!asset.assignedOrganizationId) {
      throw new BadRequestException(`Asset ${id} is not currently assigned to any organization`);
    }
    const updated = await this.prisma.asset.update({
      where: { id },
      data: {
        assignedOrganizationId: null,
        status: asset.status === 'ASSIGNED' ? 'AVAILABLE' : asset.status,
      },
    });
    await this.prisma.assetHistory.create({
      data: {
        assetId: id,
        actedById: user.id,
        eventType: 'UNASSIGNED',
        details: { previousOrganizationId: asset.assignedOrganizationId },
      },
    });
    return updated;
  }

  private async assertStoreScope(userId: string, storeId: string, organizationId: string) {
    if (!await this.access.hasScopeAccess(userId, { type: 'STORE', storeId, storeOrganizationId: organizationId })) {
      throw new ForbiddenException('You do not have access to this asset store');
    }
  }
}

