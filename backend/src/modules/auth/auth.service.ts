import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { RedisService } from '../../common/redis/redis.service';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
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
  private static readonly MAX_FAILED_LOGIN_ATTEMPTS = 5;
  private static readonly LOCKOUT_WINDOW_SECONDS = 900; // 15 minutes lockout
  private static readonly MAX_IP_REQUESTS_PER_MINUTE = 20;
  private static readonly IP_WINDOW_SECONDS = 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async login(email: string, password: string, clientIp?: string): Promise<AuthResponse> {
    const normalizedEmail = email ? email.trim().toLowerCase() : '';
    const emailKey = `login:failed:email:${normalizedEmail}`;
    const ipKey = clientIp ? `login:rate:ip:${clientIp}` : null;

    // 1. IP rate limiting (protects against rapid credential stuffing/DoS)
    if (ipKey) {
      const ipRate = await this.redisService.checkRateLimit(ipKey, AuthService.MAX_IP_REQUESTS_PER_MINUTE);
      if (!ipRate.allowed) {
        throw new HttpException(
          'Too many requests from this IP address. Please wait a minute and try again.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      await this.redisService.recordFailedAttempt(ipKey, AuthService.IP_WINDOW_SECONDS);
    }

    // 2. Email-based lockout check (checked before expensive argon2 hash verification)
    const emailRate = await this.redisService.checkRateLimit(emailKey, AuthService.MAX_FAILED_LOGIN_ATTEMPTS);
    if (!emailRate.allowed) {
      const retryMin = Math.max(1, Math.ceil(emailRate.retryAfterSeconds / 60));
      throw new HttpException(
        `Too many failed login attempts. Account temporarily locked. Please try again in ${retryMin} minute(s).`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { department: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      await this.redisService.recordFailedAttempt(emailKey, AuthService.LOCKOUT_WINDOW_SECONDS);
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await argon2.verify(user.passwordHash, password);
    if (!passwordValid) {
      const attempts = await this.redisService.recordFailedAttempt(emailKey, AuthService.LOCKOUT_WINDOW_SECONDS);
      if (attempts >= AuthService.MAX_FAILED_LOGIN_ATTEMPTS) {
        throw new HttpException(
          'Too many failed login attempts. Account temporarily locked for 15 minutes.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new UnauthorizedException('Invalid email or password');
    }

    // Reset failed login attempts upon successful authentication
    await this.redisService.resetAttempts(emailKey);

    return this.createSession(user);
  }

  async refresh(dto: RefreshTokenDto): Promise<AuthResponse> {
    try {
      const payload = this.jwtService.verify<{ sub: string; type: string }>(
        dto.refreshToken,
        {
          secret:
            this.configService.get<string>('JWT_REFRESH_SECRET') ||
            'amu-default-jwt-refresh-secret-32-chars-long-min',
        },
      );
      if (payload.type !== 'refresh') throw new Error('Invalid token type');
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { department: true },
      });
      if (!user || user.status !== 'ACTIVE') throw new Error('Inactive user');
      return this.createSession(user);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private createSession(user: { id: string; email: string; role: string; fullName: string; departmentId: string | null; department?: { name: string } | null }): AuthResponse {
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret:
          this.configService.get<string>('JWT_ACCESS_SECRET') ||
          'amu-default-jwt-access-secret-32-chars-long-min',
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '1d',
      },
    );
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          'amu-default-jwt-refresh-secret-32-chars-long-min',
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
      },
    );

    return {
      accessToken,
      refreshToken,
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
