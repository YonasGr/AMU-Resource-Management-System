import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Store } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OrganizationService } from '../organization/organization.service';
import { AccessControlService } from '../rbac/access-control.service';
import { SafeUser } from '../auth/decorators/current-user.decorator';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

@Injectable()
export class StoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizationService: OrganizationService,
    private readonly accessControlService: AccessControlService,
  ) {}

  async create(dto: CreateStoreDto, currentUser: SafeUser): Promise<Store> {
    // Confirms the org unit exists.
    await this.organizationService.findOne(dto.organizationId);

    // Scope check: can this user manage stores under this org unit?
    // (permission possession — store.manage — was already checked by the
    // route guard; this checks WHERE they're allowed to use it.)
    const allowed = await this.accessControlService.hasScopeAccess(currentUser.id, {
      type: 'ORGANIZATION',
      organizationId: dto.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenException(
        'You do not have access to create stores under this organization unit',
      );
    }

    if (dto.managerId) {
      const manager = await this.prisma.user.findUnique({ where: { id: dto.managerId } });
      if (!manager) {
        throw new NotFoundException(`User ${dto.managerId} not found`);
      }
    }

    try {
      return await this.prisma.store.create({
        data: {
          name: dto.name,
          code: dto.code,
          location: dto.location,
          organizationId: dto.organizationId,
          managerId: dto.managerId,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(`A store with code "${dto.code}" already exists`);
      }
      throw err;
    }
  }

  /** Stores visible to this user: everything if GLOBAL, otherwise only stores
   * within their accessible org units or directly STORE-scoped to them. */
  async findAll(
    currentUser: SafeUser,
    filter?: { organizationId?: string; status?: string },
  ): Promise<Store[]> {
    const accessibleOrgIds = await this.accessControlService.getAccessibleOrganizationIds(
      currentUser.id,
    );
    const accessibleStoreIds = await this.accessControlService.getAccessibleStoreIds(
      currentUser.id,
    );

    const where: Prisma.StoreWhereInput = {
      organizationId: filter?.organizationId,
      status: filter?.status as any,
    };

    if (accessibleOrgIds !== 'ALL') {
      where.OR = [
        { organizationId: { in: Array.from(accessibleOrgIds) } },
        { id: { in: Array.from(accessibleStoreIds) } },
      ];
    }

    return this.prisma.store.findMany({ where, orderBy: { name: 'asc' } });
  }

  async findOne(id: string, currentUser: SafeUser): Promise<Store> {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) {
      throw new NotFoundException(`Store ${id} not found`);
    }

    const allowed = await this.accessControlService.hasScopeAccess(currentUser.id, {
      type: 'STORE',
      storeId: store.id,
      storeOrganizationId: store.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenException('You do not have access to this store');
    }

    return store;
  }

  async update(id: string, dto: UpdateStoreDto, currentUser: SafeUser): Promise<Store> {
    const store = await this.findOne(id, currentUser); // also enforces scope access

    return this.prisma.store.update({
      where: { id: store.id },
      data: dto,
    });
  }

  async assignManager(id: string, managerId: string, currentUser: SafeUser): Promise<Store> {
    const store = await this.findOne(id, currentUser); // also enforces scope access

    const manager = await this.prisma.user.findUnique({ where: { id: managerId } });
    if (!manager) {
      throw new NotFoundException(`User ${managerId} not found`);
    }

    return this.prisma.store.update({
      where: { id: store.id },
      data: { managerId },
    });
  }

  /** Soft-deactivate rather than hard delete — inventory history must stay intact. */
  async deactivate(id: string, currentUser: SafeUser): Promise<Store> {
    const store = await this.findOne(id, currentUser); // also enforces scope access
    return this.prisma.store.update({
      where: { id: store.id },
      data: { status: 'INACTIVE' },
    });
  }
}
