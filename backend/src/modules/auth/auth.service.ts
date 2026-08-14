import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    departmentId?: string | null;
    departmentName?: string | null;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { department: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await argon2.verify(user.passwordHash, password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.getOrThrow<string>('JWT_ACCESS_EXPIRES_IN'),
      },
    );

    return {
      accessToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
        departmentName: user.department?.name,
      },
    };
  }

  async register(dto: {
    fullName: string;
    email: string;
    phone?: string;
    password: string;
    departmentId?: string;
  }): Promise<AuthResponse> {
    const createdUser = await this.usersService.create({
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      password: dto.password,
      role: 'REQUESTER' as any,
      departmentId: dto.departmentId,
    });

    return this.login(dto.email, dto.password);
  }
}
