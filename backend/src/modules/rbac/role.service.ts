import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Role[]> {
    return this.prisma.role.findMany({ orderBy: { name: 'asc' } });
  }

  async findById(id: string): Promise<Role> {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role ${id} not found`);
    }
    return role;
  }

  async create(dto: CreateRoleDto): Promise<Role> {
    const existing = await this.prisma.role.findUnique({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`A role with code ${dto.code} already exists`);
    }
    return this.prisma.role.create({
      data: { code: dto.code, name: dto.name, description: dto.description },
    });
  }

  /** System (seeded) roles can't be deleted — only custom roles created afterward can. */
  async delete(id: string): Promise<void> {
    const role = await this.findById(id);
    if (role.isSystem) {
      throw new BadRequestException(`"${role.name}" is a system role and cannot be deleted`);
    }
    await this.prisma.role.delete({ where: { id } });
  }

  async getPermissionKeysForRole(roleId: string): Promise<string[]> {
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: { permission: true },
    });
    return rolePermissions.map((rp) => rp.permission.key);
  }

  async setRolePermissions(roleId: string, permissionKeys: string[]): Promise<void> {
    await this.findById(roleId);
    const permissions = await this.prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
    });
    if (permissions.length !== permissionKeys.length) {
      const found = new Set(permissions.map((p) => p.key));
      const missing = permissionKeys.filter((k) => !found.has(k));
      throw new BadRequestException(`Unknown permission key(s): ${missing.join(', ')}`);
    }

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      this.prisma.rolePermission.createMany({
        data: permissions.map((p) => ({ roleId, permissionId: p.id })),
      }),
    ]);
  }
}
