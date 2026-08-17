import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Create notifications for one or more users */
  async createForUsers(
    userIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, unknown>,
  ) {
    if (!userIds.length) return;
    await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type,
        title,
        message,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: (metadata as any) ?? undefined,
      })),
      skipDuplicates: true,
    });
  }

  /** Get all user IDs with a given role */
  async getUserIdsByRole(role: string): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: { role: role as any, status: 'ACTIVE' },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  /** Get recent notifications for a user (newest first) */
  async getForUser(userId: string, opts?: { limit?: number; unreadOnly?: boolean }) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(opts?.unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: opts?.limit ?? 50,
    });
  }

  /** Count unread notifications for a user */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  /** Mark a single notification as read (only if it belongs to the user) */
  async markAsRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  /** Mark all of a user's notifications as read */
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  /** Delete all read notifications for a user (clear-all) */
  async deleteAllRead(userId: string) {
    return this.prisma.notification.deleteMany({
      where: { userId, isRead: true },
    });
  }
}
