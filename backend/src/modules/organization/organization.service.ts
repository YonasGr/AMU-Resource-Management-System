import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationUnit } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrganizationUnitDto } from './dto/create-organization-unit.dto';
import { UpdateOrganizationUnitDto } from './dto/update-organization-unit.dto';

export interface OrganizationUnitTreeNode extends OrganizationUnit {
  children: OrganizationUnitTreeNode[];
}

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrganizationUnitDto): Promise<OrganizationUnit> {
    if (dto.parentId) {
      const parent = await this.prisma.organizationUnit.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException(`Parent organization unit ${dto.parentId} not found`);
      }
    }

    return this.prisma.organizationUnit.create({
      data: {
        name: dto.name,
        type: dto.type,
        parentId: dto.parentId ?? null,
      },
    });
  }

  async findAll(filter?: { type?: string; status?: string }): Promise<OrganizationUnit[]> {
    return this.prisma.organizationUnit.findMany({
      where: {
        type: filter?.type as any,
        status: filter?.status as any,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string): Promise<OrganizationUnit> {
    const unit = await this.prisma.organizationUnit.findUnique({ where: { id } });
    if (!unit) {
      throw new NotFoundException(`Organization unit ${id} not found`);
    }
    return unit;
  }

  async update(id: string, dto: UpdateOrganizationUnitDto): Promise<OrganizationUnit> {
    await this.findOne(id);

    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('An organization unit cannot be its own parent');
      }
      const ancestors = await this.getAncestors(dto.parentId);
      if (ancestors.some((a) => a.id === id)) {
        throw new BadRequestException(
          'Cannot move a unit under one of its own descendants (would create a cycle)',
        );
      }
    }

    return this.prisma.organizationUnit.update({
      where: { id },
      data: dto,
    });
  }

  /** Soft-deactivate rather than hard delete — history/audit must remain intact. */
  async deactivate(id: string): Promise<OrganizationUnit> {
    await this.findOne(id);
    return this.prisma.organizationUnit.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }

  async getChildren(id: string): Promise<OrganizationUnit[]> {
    await this.findOne(id);
    return this.prisma.organizationUnit.findMany({
      where: { parentId: id },
      orderBy: { name: 'asc' },
    });
  }

  /** Walk up from a unit to the root, returning [immediateParent, ..., root]. */
  async getAncestors(id: string): Promise<OrganizationUnit[]> {
    const ancestors: OrganizationUnit[] = [];
    let current = await this.prisma.organizationUnit.findUnique({ where: { id } });

    while (current?.parentId) {
      const parent = await this.prisma.organizationUnit.findUnique({
        where: { id: current.parentId },
      });
      if (!parent) break;
      ancestors.push(parent);
      current = parent;
    }

    return ancestors;
  }

  /** Full nested tree starting from every root unit (parentId === null). */
  async getTree(): Promise<OrganizationUnitTreeNode[]> {
    const allUnits = await this.prisma.organizationUnit.findMany({
      orderBy: { name: 'asc' },
    });

    const byParent = new Map<string | null, OrganizationUnit[]>();
    for (const unit of allUnits) {
      const key = unit.parentId ?? null;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(unit);
    }

    const build = (parentId: string | null): OrganizationUnitTreeNode[] =>
      (byParent.get(parentId) ?? []).map((unit) => ({
        ...unit,
        children: build(unit.id),
      }));

    return build(null);
  }

  /** Nested subtree rooted at a specific unit (unit + all its descendants). */
  async getSubtree(id: string): Promise<OrganizationUnitTreeNode> {
    const root = await this.findOne(id);
    const allUnits = await this.prisma.organizationUnit.findMany({
      orderBy: { name: 'asc' },
    });

    const byParent = new Map<string, OrganizationUnit[]>();
    for (const unit of allUnits) {
      if (!unit.parentId) continue;
      if (!byParent.has(unit.parentId)) byParent.set(unit.parentId, []);
      byParent.get(unit.parentId)!.push(unit);
    }

    const build = (unit: OrganizationUnit): OrganizationUnitTreeNode => ({
      ...unit,
      children: (byParent.get(unit.id) ?? []).map(build),
    });

    return build(root);
  }
}
