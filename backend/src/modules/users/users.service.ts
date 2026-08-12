import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto): Promise<Omit<User, 'passwordHash'>> {
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
        organizationId: dto.organizationId,
      },
    });

    return this.stripPassword(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  async findAll(): Promise<any[]> {
    const users = await this.prisma.user.findMany({
      include: {
        organization: { select: { id: true, name: true } },
        userRoles: {
          include: {
            role: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });
    return users.map((u) => this.stripPassword(u));
  }

  async update(id: string, dto: any): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.fullName ? { fullName: dto.fullName } : {}),
        ...(dto.email ? { email: dto.email } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.organizationId ? { organizationId: dto.organizationId } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
      include: {
        organization: { select: { id: true, name: true } },
        userRoles: {
          include: {
            role: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    return this.stripPassword(updated);
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  private stripPassword(user: any): any {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
