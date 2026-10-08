import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../common/redis/redis.service';
import { HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';

describe('AuthService (with Redis rate limiting & lockout)', () => {
  let service: AuthService;
  let redisService: RedisService;
  let prisma: any;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'admin@store.com',
    fullName: 'System Administrator',
    passwordHash: '',
    role: 'ADMINISTRATOR',
    status: 'ACTIVE',
    departmentId: 'dept-1',
    department: { name: 'General Administration' },
  };

  beforeAll(async () => {
    mockUser.passwordHash = await argon2.hash('Secret#Pass123!');
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'REDIS_HOST') return 'localhost';
              if (key === 'REDIS_PORT') return 6379;
              return undefined;
            }),
            getOrThrow: jest.fn((key: string) => {
              if (key === 'JWT_ACCESS_SECRET') return 'test-access-secret';
              if (key === 'JWT_ACCESS_EXPIRES_IN') return '15m';
              if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
              if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
              throw new Error(`Missing config: ${key}`);
            }),
          },
        },
        RedisService, // Use actual RedisService (which falls back to memoryStore in test env)
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    redisService = module.get<RedisService>(RedisService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    await redisService.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(redisService).toBeDefined();
  });

  it('should authenticate active user with correct password and reset failed counter', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);

    const result = await service.login('admin@store.com', 'Secret#Pass123!', '127.0.0.1');

    expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
    expect(result).toHaveProperty('refreshToken', 'mock-jwt-token');
    expect(result.user.email).toBe('admin@store.com');

    // Email failed attempts should be reset/empty
    const failedCount = await redisService.get('login:failed:email:admin@store.com');
    expect(failedCount).toBeNull();
  });

  it('should reject invalid password and increment failed attempts', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);

    await expect(
      service.login('admin@store.com', 'wrongpassword', '127.0.0.1'),
    ).rejects.toThrow(UnauthorizedException);

    const failedCount = await redisService.get('login:failed:email:admin@store.com');
    expect(failedCount).toBe('1');
  });

  it('should reject non-existent user and record failed attempt', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login('ghost@store.com', 'password', '127.0.0.1'),
    ).rejects.toThrow(UnauthorizedException);

    const failedCount = await redisService.get('login:failed:email:ghost@store.com');
    expect(failedCount).toBe('1');
  });

  it('should lock out account after 5 consecutive failed login attempts', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);

    // Attempt 1 to 4: returns UnauthorizedException
    for (let i = 1; i <= 4; i++) {
      await expect(
        service.login('admin@store.com', 'wrongpassword', '127.0.0.1'),
      ).rejects.toThrow(UnauthorizedException);
    }

    // 5th failed attempt: reaches max attempts, triggers 429 Too Many Requests
    await expect(
      service.login('admin@store.com', 'wrongpassword', '127.0.0.1'),
    ).rejects.toThrow(HttpException);

    // 6th attempt: immediately locked out before querying DB or calculating argon2
    try {
      await service.login('admin@store.com', 'Secret#Pass123!', '127.0.0.1');
      fail('Should have thrown 429 Too Many Requests');
    } catch (err: any) {
      expect(err).toBeInstanceOf(HttpException);
      expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(err.message).toContain('Account temporarily locked');
    }
  });

  it('should throttle IP when exceeding rapid request limit', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);

    // Pre-record 20 requests from the same IP to simulate rapid traffic
    for (let i = 0; i < 20; i++) {
      await redisService.recordFailedAttempt('login:rate:ip:192.168.1.50', 60);
    }

    // Next request from the same IP should immediately be blocked with 429
    await expect(
      service.login('anyuser@store.com', 'Secret#Pass123!', '192.168.1.50'),
    ).rejects.toThrow(HttpException);
  }, 10000);
});
