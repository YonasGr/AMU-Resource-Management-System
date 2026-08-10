import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { parseDurationToMs } from '../../common/utils/duration.util';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async login(email: string, password: string): Promise<AuthTokens> {
    const user = await this.usersService.findByEmail(email);
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await argon2.verify(user.passwordHash, password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueTokens(user.id, user.email);
  }

  async refresh(rawRefreshToken: string): Promise<AuthTokens> {
    const tokenHash = this.hashToken(rawRefreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt < new Date() ||
      stored.user.status !== 'ACTIVE'
    ) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    // Refresh token rotation — revoke old token and issue a new pair
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(stored.userId, stored.user.email);
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Generates a single-use 1-hour password reset token and emails it to the user.
   */
  async requestPasswordReset(email: string): Promise<{ sent: true } | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Don't reveal whether the email exists.
      return null;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    await this.prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + parseDurationToMs('1h')),
      },
    });

    setImmediate(() => {
      this.mailService.sendPasswordResetEmail(user.email, rawToken).catch(() => undefined);
    });

    return { sent: true };
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    const stored = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Reset token is invalid or expired');
    }

    const passwordHash = await argon2.hash(newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: stored.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
      // Invalidate every existing session — a password reset should log out
      // every device, not just issue a new token alongside old valid ones.
      this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  private async issueTokens(userId: string, email: string): Promise<AuthTokens> {
    const accessToken = this.jwtService.sign(
      { sub: userId, email },
      {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.getOrThrow<string>('JWT_ACCESS_EXPIRES_IN'),
      },
    );

    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const refreshExpiresIn = this.configService.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN');

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: this.hashToken(rawRefreshToken),
        userId,
        expiresAt: new Date(Date.now() + parseDurationToMs(refreshExpiresIn)),
      },
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  /** Refresh/reset tokens are stored only as a hash — never the raw value. */
  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }
}
