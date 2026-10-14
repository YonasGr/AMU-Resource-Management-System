import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { User, Role, UserStatus, ScopeType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { randomUUID } from 'node:crypto';

export interface CreateUserDto {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  role?: Role;
  scopeType?: ScopeType;
  departmentId?: string;
  storeId?: string;
  status?: UserStatus;
}

export interface UpdateUserDto {
  fullName?: string;
  email?: string;
  phone?: string | null;
  role?: Role;
  status?: UserStatus;
  scopeType?: ScopeType;
  departmentId?: string | null;
  storeId?: string | null;
  password?: string;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateUserDto, actorId?: string): Promise<Omit<User, 'passwordHash'>> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException(`A user with email ${dto.email} already exists`);
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email,
        phone: dto.phone,
        passwordHash,
        role: dto.role || Role.REQUESTER,
        status: dto.status || UserStatus.ACTIVE,
        employeeCode: `EMP-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`,
        scopeType: dto.scopeType || ScopeType.STORE,
        departmentId: dto.departmentId || null,
        storeId: dto.storeId || null,
      },
      include: {
        department: true,
        store: true,
      },
    });

    await this.auditService.log(
      actorId || user.id,
      'CREATE_USER',
      'USERS',
      `Registered new user "${user.fullName}" (${user.email}) with role [${user.role}] and scope [${user.scopeType}]`,
      {
        entityType: 'User',
        entityId: user.id,
        afterData: this.auditSnapshot(user),
      },
    );

    return this.stripPassword(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: { department: true, store: true },
    });
  }

  async findById(id: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { department: true, store: true },
    });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return this.stripPassword(user);
  }

  async findAll(): Promise<any[]> {
    const users = await this.prisma.user.findMany({
      include: {
        department: true,
        store: true,
      },
      orderBy: { fullName: 'asc' },
    });
    return users.map((u) => this.stripPassword(u));
  }

  async restoreUsers(records: unknown[], actorId: string): Promise<{ restored: number; skipped: number }> {
    if (!Array.isArray(records) || records.length > 10000) {
      throw new BadRequestException('Backup must contain a valid users array');
    }
    let restored = 0;
    let skipped = 0;
    for (const value of records) {
      if (!value || typeof value !== 'object') { skipped++; continue; }
      const row = value as Record<string, unknown>;
      if (typeof row.email !== 'string' || typeof row.fullName !== 'string') { skipped++; continue; }
      const existing = await this.prisma.user.findUnique({ where: { email: row.email } });
      // Exported user listings omit password hashes. Restore updates matching
      // accounts while preserving credentials and never invents a password.
      if (!existing) { skipped++; continue; }
      const allowedRoles = Object.values(Role) as string[];
      const allowedStatuses = Object.values(UserStatus) as string[];
      const allowedScopes = Object.values(ScopeType) as string[];
      await this.update(existing.id, {
        fullName: row.fullName,
        phone: typeof row.phone === 'string' || row.phone === null ? row.phone as string : undefined,
        ...(allowedRoles.includes(String(row.role)) ? { role: row.role as Role } : {}),
        ...(allowedStatuses.includes(String(row.status)) ? { status: row.status as UserStatus } : {}),
        ...(allowedScopes.includes(String(row.scopeType)) ? { scopeType: row.scopeType as ScopeType } : {}),
        ...(row.departmentId === null || typeof row.departmentId === 'string' ? { departmentId: row.departmentId as string | null } : {}),
        ...(row.storeId === null || typeof row.storeId === 'string' ? { storeId: row.storeId as string | null } : {}),
      }, actorId);
      restored++;
    }
    return { restored, skipped };
  }

  async update(id: string, dto: UpdateUserDto, actorId?: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    // Safety: Protect against deactivating or demoting the last active Administrator
    if (user.role === Role.ADMINISTRATOR) {
      const isDemoting = dto.role && dto.role !== Role.ADMINISTRATOR;
      const isDeactivating = dto.status && dto.status === UserStatus.INACTIVE;
      if (isDemoting || isDeactivating) {
        const otherActiveAdmins = await this.prisma.user.count({
          where: {
            role: Role.ADMINISTRATOR,
            status: UserStatus.ACTIVE,
            id: { not: id },
          },
        });
        if (otherActiveAdmins === 0) {
          throw new BadRequestException(
            'Cannot deactivate or demote the last remaining active Administrator in the system',
          );
        }
      }
    }

    let passwordHash = undefined;
    if (dto.password) {
      passwordHash = await argon2.hash(dto.password);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.fullName ? { fullName: dto.fullName } : {}),
        ...(dto.email ? { email: dto.email } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.role ? { role: dto.role } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.scopeType ? { scopeType: dto.scopeType } : {}),
        ...(dto.departmentId !== undefined ? { departmentId: dto.departmentId } : {}),
        ...(dto.storeId !== undefined ? { storeId: dto.storeId } : {}),
        ...(passwordHash ? { passwordHash } : {}),
      },
      include: {
        department: true,
        store: true,
      },
    });

    const changeSummary = Object.keys(dto).filter((k) => k !== 'password').join(', ');
    await this.auditService.log(
      actorId || id,
      'UPDATE_USER',
      'USERS',
      `Updated user "${updated.fullName}" (${updated.email}). Modified fields: [${changeSummary || 'password'}]`,
      {
        entityType: 'User',
        entityId: updated.id,
        beforeData: this.auditSnapshot(user),
        afterData: this.auditSnapshot(updated),
      },
    );

    return this.stripPassword(updated);
  }

  async delete(id: string, currentUserId?: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    if (currentUserId && currentUserId === id) {
      throw new BadRequestException('Security violation: You cannot delete your own active administrator account');
    }

    if (user.role === Role.ADMINISTRATOR) {
      const otherActiveAdmins = await this.prisma.user.count({
        where: {
          role: Role.ADMINISTRATOR,
          status: UserStatus.ACTIVE,
          id: { not: id },
        },
      });
      if (otherActiveAdmins === 0) {
        throw new BadRequestException('Cannot delete the last remaining active Administrator in the system');
      }
    }

    await this.prisma.user.delete({ where: { id } });

    await this.auditService.log(
      currentUserId || null,
      'DELETE_USER',
      'USERS',
      `Deleted user account "${user.fullName}" (${user.email}, role: ${user.role})`,
      {
        entityType: 'User',
        entityId: user.id,
        beforeData: this.auditSnapshot(user),
        reason: 'Administrative user deletion',
      },
    );
  }

  private auditSnapshot(user: Pick<User, 'id' | 'fullName' | 'email' | 'phone' | 'role' | 'status' | 'scopeType' | 'departmentId' | 'storeId'>) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      scopeType: user.scopeType,
      departmentId: user.departmentId,
      storeId: user.storeId,
    };
  }

  private stripPassword(user: any): any {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
