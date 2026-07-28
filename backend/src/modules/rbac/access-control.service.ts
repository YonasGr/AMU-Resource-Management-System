import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ScopeType, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OrganizationService } from '../organization/organization.service';
import { AssignRoleDto } from './dto/assign-role.dto';

export type ScopeTarget =
  | { type: 'ORGANIZATION'; organizationId: string }
  // storeOrganizationId = the organization the store belongs to. Store
  // itself doesn't exist yet (Phase 2.1) — this shape is ready for that
  // module to call once it does.
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
    // STORE existence isn't checked yet — the Store model lands in Phase 2.1.

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

  /** True if targetOrgId is scopeOrgId itself, or a descendant of it. */
  private async isOrgWithinScope(scopeOrgId: string, targetOrgId: string): Promise<boolean> {
    if (scopeOrgId === targetOrgId) return true;
    const ancestors = await this.organizationService.getAncestors(targetOrgId);
    return ancestors.some((a) => a.id === scopeOrgId);
  }
}
