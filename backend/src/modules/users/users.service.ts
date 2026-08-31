import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { User, Role, UserStatus, ScopeType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface CreateUserDto {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  role?: Role;
  scopeType?: ScopeType;
  departmentId?: string;
  storeId?: string;
}

export interface UpdateUserDto {
  fullName?: string;
  email?: string;
  phone?: string;
  role?: Role;
  status?: UserStatus;
  scopeType?: ScopeType;
  departmentId?: string;
  storeId?: string;
  password?: string;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateUserDto, actorId?: string): Promise<Omit<User, 'passwordHash'>> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException(`A user with email ${dto.email} already exists`);
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        role: dto.role || Role.REQUESTER,
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
    );
  }

  private stripPassword(user: any): any {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
