import { Controller, Delete, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, SafeUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get recent notifications for the current user' })
  async getMyNotifications(@CurrentUser() user: SafeUser) {
    const notifications = await this.notificationsService.getForUser(user.id);
    return notifications;
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count for the current user' })
  async getUnreadCount(@CurrentUser() user: SafeUser) {
    const count = await this.notificationsService.getUnreadCount(user.id);
    return { count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  async markAsRead(
    @CurrentUser() user: SafeUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.notificationsService.markAsRead(user.id, id);
    return { success: true };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@CurrentUser() user: SafeUser) {
    await this.notificationsService.markAllAsRead(user.id);
    return { success: true };
  }

  @Delete('read')
  @ApiOperation({ summary: 'Delete all read notifications for the current user' })
  async deleteRead(@CurrentUser() user: SafeUser) {
    await this.notificationsService.deleteAllRead(user.id);
    return { success: true };
  }
}
