import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SafeUser } from '../auth/decorators/current-user.decorator';

/**
 * In-app notification delivery. Each service that triggers a meaningful event
 * (workflow step advanced, stock dropped below minimum, goods received, etc.)
 * calls notify() to create rows here. The frontend polls /notifications to
 * render the bell badge and inbox — no WebSockets or email needed for Phase 8.
 */
@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Internal helper — called by other services to fan out notifications.
   * Never throws; a notification failure must never block the primary action.
   */
  async notify(
    userIds: string[],
    type: NotificationType,
    title: string,
    body: string,
    entityType?: string,
    entityId?: string,
  ): Promise<void> {
    if (userIds.length === 0) return;
    try {
      await this.prisma.notification.createMany({
        data: userIds.map((userId) => ({
          userId,
          type,
          title,
          body,
          entityType: entityType ?? null,
          entityId: entityId ?? null,
        })),
        skipDuplicates: false,
      });
    } catch {
      // Intentional swallow — notification failure must not break the caller.
    }
  }

  /** Current user's notifications, newest first. Optionally filter to unread only. */
  async findMine(currentUser: SafeUser, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: {
        userId: currentUser.id,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markRead(id: string, currentUser: SafeUser): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id, userId: currentUser.id },
      data: { isRead: true },
    });
  }

  async markAllRead(currentUser: SafeUser): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId: currentUser.id, isRead: false },
      data: { isRead: true },
    });
  }
}
