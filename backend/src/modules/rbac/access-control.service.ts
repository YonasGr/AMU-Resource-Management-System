import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ScopeType, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OrganizationService } from '../organization/organization.service';
import { AssignRoleDto } from './dto/assign-role.dto';

export type ScopeTarget =
  | { type: 'ORGANIZATION'; organizationId: string }
  | { type: 'STORE'; storeId: string; storeOrganizationId: string };

@Injectable()
export class AccessControlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizationService: OrganizationService,
  ) {}

  async assignRole(dto: AssignRoleDto): Promise<UserRole> {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException(`User ${dto.userId} not found`);
    }

    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) {
      throw new NotFoundException(`Role ${dto.roleId} not found`);
    }

    if (dto.scopeType === ScopeType.GLOBAL && dto.scopeId) {
      throw new BadRequestException('GLOBAL scope must not include a scopeId');
    }
    if (dto.scopeType !== ScopeType.GLOBAL && !dto.scopeId) {
      throw new BadRequestException(`${dto.scopeType} scope requires a scopeId`);
    }

    if (dto.scopeType === ScopeType.ORGANIZATION && dto.scopeId) {
      // Confirms the org unit exists — reuses OrganizationService so a bad
      // id fails clearly instead of silently creating an unreachable grant.
      await this.organizationService.findOne(dto.scopeId);
    }

    if (dto.scopeType === ScopeType.STORE && dto.scopeId) {
      const store = await this.prisma.store.findUnique({ where: { id: dto.scopeId } });
      if (!store) {
        throw new NotFoundException(`Store ${dto.scopeId} not found`);
      }
    }

    return this.prisma.userRole.create({
      data: {
        userId: dto.userId,
        roleId: dto.roleId,
        scopeType: dto.scopeType,
        scopeId: dto.scopeId ?? null,
      },
    });
  }

  async revokeRoleAssignment(id: string): Promise<void> {
    const assignment = await this.prisma.userRole.findUnique({ where: { id } });
    if (!assignment) {
      throw new NotFoundException(`Role assignment ${id} not found`);
    }
    await this.prisma.userRole.delete({ where: { id } });
  }

  async getUserRoleAssignments(userId: string) {
    return this.prisma.userRole.findMany({
      where: { userId },
      include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
    });
  }

  /** All permission keys the user holds, from any role assignment at any scope. */
  async getUserPermissionKeys(userId: string): Promise<Set<string>> {
    const assignments = await this.getUserRoleAssignments(userId);
    const keys = new Set<string>();
    for (const assignment of assignments) {
      for (const rp of assignment.role.rolePermissions) {
        keys.add(rp.permission.key);
      }
    }
    return keys;
  }

  async hasPermission(userId: string, permissionKey: string): Promise<boolean> {
    const keys = await this.getUserPermissionKeys(userId);
    return keys.has(permissionKey);
  }

  /**
   * Checks whether the user has ANY role assignment whose scope covers the
   * given target. A GLOBAL assignment always covers everything. An
   * ORGANIZATION assignment covers its own org unit and every descendant
   * (a College Administrator scoped to a college can act on that college's
   * departments too). A STORE assignment covers only that exact store.
   *
   * This is deliberately separate from hasPermission(): a user might hold
   * the "inventory.issue" permission via a role, but that role's assignment
   * might be scoped to a different store — both checks must pass.
   */
  async hasScopeAccess(userId: string, target: ScopeTarget): Promise<boolean> {
    const assignments = await this.prisma.userRole.findMany({ where: { userId } });

    if (assignments.some((a) => a.scopeType === ScopeType.GLOBAL)) {
      return true;
    }

    if (target.type === 'ORGANIZATION') {
      const orgAssignments = assignments.filter((a) => a.scopeType === ScopeType.ORGANIZATION);
      if (orgAssignments.length === 0) return false;

      for (const assignment of orgAssignments) {
        if (await this.isOrgWithinScope(assignment.scopeId!, target.organizationId)) {
          return true;
        }
      }
      return false;
    }

    // target.type === 'STORE'
    const storeAssignments = assignments.filter((a) => a.scopeType === ScopeType.STORE);
    if (storeAssignments.some((a) => a.scopeId === target.storeId)) {
      return true;
    }

    const orgAssignments = assignments.filter((a) => a.scopeType === ScopeType.ORGANIZATION);
    for (const assignment of orgAssignments) {
      if (await this.isOrgWithinScope(assignment.scopeId!, target.storeOrganizationId)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Returns 'ALL' if the user has a GLOBAL assignment (no filtering needed),
   * otherwise the full set of organization unit ids their ORGANIZATION-scoped
   * assignments cover — each assignment's own org unit plus every descendant.
   * Used to scope list endpoints (e.g. "which stores can this user see").
   */
  async getAccessibleOrganizationIds(userId: string): Promise<'ALL' | Set<string>> {
    const assignments = await this.prisma.userRole.findMany({ where: { userId } });

    if (assignments.some((a) => a.scopeType === ScopeType.GLOBAL)) {
      return 'ALL';
    }

    const ids = new Set<string>();
    const orgAssignments = assignments.filter((a) => a.scopeType === ScopeType.ORGANIZATION);

    for (const assignment of orgAssignments) {
      const subtree = await this.organizationService.getSubtree(assignment.scopeId!);
      const flatten = (node: { id: string; children: any[] }) => {
        ids.add(node.id);
        node.children.forEach(flatten);
      };
      flatten(subtree);
    }

    return ids;
  }

  /** The exact set of store ids the user has a direct STORE-scoped assignment for. */
  async getAccessibleStoreIds(userId: string): Promise<Set<string>> {
    const assignments = await this.prisma.userRole.findMany({
      where: { userId, scopeType: ScopeType.STORE },
    });
    return new Set(assignments.map((a) => a.scopeId!));
  }

  // --- Role-aware scope checks, used by the Phase 4 Workflow Engine's
  // approver resolution. These differ from hasScopeAccess() above by also
  // requiring a SPECIFIC role (not just any assignment) — a workflow step
  // like "Department Head approval" needs someone holding that exact role,
  // not merely someone with scope access for an unrelated reason.

  /** Does the user hold roleCode at all, regardless of scope? (FIXED_ROLE steps.) */
  async userHasRole(userId: string, roleCode: string): Promise<boolean> {
    const count = await this.prisma.userRole.count({
      where: { userId, role: { code: roleCode } },
    });
    return count > 0;
  }

  /** Does the user hold roleCode scoped (GLOBAL, or ORGANIZATION covering orgId)? */
  async userHasRoleAtOrgScope(userId: string, roleCode: string, orgId: string): Promise<boolean> {
    const assignments = await this.prisma.userRole.findMany({
      where: { userId, role: { code: roleCode } },
    });
    for (const assignment of assignments) {
      if (assignment.scopeType === ScopeType.GLOBAL) return true;
      if (
        assignment.scopeType === ScopeType.ORGANIZATION &&
        (await this.isOrgWithinScope(assignment.scopeId!, orgId))
      ) {
        return true;
      }
    }
    return false;
  }

  /** Does the user hold roleCode scoped to the PARENT of orgId (or GLOBAL)? */
  async userHasRoleAtParentOrgScope(
    userId: string,
    roleCode: string,
    orgId: string,
  ): Promise<boolean> {
    const ancestors = await this.organizationService.getAncestors(orgId);
    if (ancestors.length === 0) {
      // orgId is already the root — there's no "level up", so only a GLOBAL
      // assignment can satisfy this step.
      return this.prisma.userRole
        .count({ where: { userId, role: { code: roleCode }, scopeType: ScopeType.GLOBAL } })
        .then((count) => count > 0);
    }
    const parentOrgId = ancestors[0].id;
    return this.userHasRoleAtOrgScope(userId, roleCode, parentOrgId);
  }

  /** Does the user hold roleCode scoped (GLOBAL, STORE=storeId, or ORGANIZATION covering the store's org)? */
  async userHasRoleAtStoreScope(
    userId: string,
    roleCode: string,
    storeId: string,
    storeOrganizationId: string,
  ): Promise<boolean> {
    const assignments = await this.prisma.userRole.findMany({
      where: { userId, role: { code: roleCode } },
    });
    for (const assignment of assignments) {
      if (assignment.scopeType === ScopeType.GLOBAL) return true;
      if (assignment.scopeType === ScopeType.STORE && assignment.scopeId === storeId) return true;
      if (
        assignment.scopeType === ScopeType.ORGANIZATION &&
        (await this.isOrgWithinScope(assignment.scopeId!, storeOrganizationId))
      ) {
        return true;
      }
    }
    return false;
  }

  /** True if targetOrgId is scopeOrgId itself, or a descendant of it. */
  async isOrgWithinScope(scopeOrgId: string, targetOrgId: string): Promise<boolean> {
    if (scopeOrgId === targetOrgId) return true;
    const ancestors = await this.organizationService.getAncestors(targetOrgId);
    return ancestors.some((a) => a.id === scopeOrgId);
  }
}
