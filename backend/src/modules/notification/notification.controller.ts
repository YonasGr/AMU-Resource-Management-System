import {
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { CurrentUser, SafeUser } from '../auth/decorators/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: "Current user's notifications" })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  findMine(
    @CurrentUser() user: SafeUser,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationService.findMine(user, unreadOnly === 'true');
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Count of unread notifications for the current user' })
  async unreadCount(@CurrentUser() user: SafeUser) {
    const count = await this.notificationService.countUnread(user.id);
    return { count };
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  async markRead(@Param('id') id: string, @CurrentUser() user: SafeUser) {
    await this.notificationService.markRead(id, user);
    return { ok: true };
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@CurrentUser() user: SafeUser) {
    await this.notificationService.markAllRead(user);
    return { ok: true };
  }
}
