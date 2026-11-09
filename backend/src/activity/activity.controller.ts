import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { DatabaseService } from '../database/database.service';
import { UserEntity } from '../database/entities';
import { WebSocketService } from '../core/websocket.service';

@Controller('activity')
@UseGuards(AuthGuard)
export class ActivityController {
  constructor(
    private readonly db: DatabaseService,
    private readonly ws: WebSocketService,
  ) {}

  @Get('logs')
  listActivityLogs(
    @Query('project_id') projectId: string | undefined,
    @Query('limit') limitStr: string | undefined,
    @CurrentUser() user: UserEntity,
  ) {
    const limit = Math.min(200, Math.max(1, parseInt(limitStr || '50', 10) || 50));

    if (projectId) {
      this.db.verifyProjectAccess(projectId, user);
      return this.db.store.activity_logs
        .filter((a) => a.project_id === projectId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, limit);
    }

    const accessibleIds = new Set(this.db.getAccessibleProjectIds(user));
    return this.db.store.activity_logs
      .filter(
        (a) =>
          a.user_id === user.id ||
          (a.project_id && accessibleIds.has(a.project_id)),
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }

  @Get('notifications')
  listNotifications(
    @Query('unread_only') unreadOnlyStr: string | undefined,
    @CurrentUser() user: UserEntity,
  ) {
    const unreadOnly = unreadOnlyStr === 'true' || unreadOnlyStr === '1';
    const notifs = this.db.store.notifications
      .filter((n) => n.user_id === user.id && (!unreadOnly || !n.is_read))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 50);

    const unread_count = this.db.store.notifications.filter(
      (n) => n.user_id === user.id && !n.is_read,
    ).length;

    return {
      notifications: notifs,
      unread_count,
    };
  }

  @Post('notifications')
  createNotification(
    @Body() body: { title: string; message: string; type?: any; link_url?: string },
    @CurrentUser() user: UserEntity,
  ) {
    const notif = this.db.createNotification(
      user.id,
      body.title || 'Notification',
      body.message || '',
      body.type || 'info',
      body.link_url || null,
    );
    if (this.ws) {
      this.ws.broadcastGlobal('notification', notif);
    }
    return notif;
  }

  @Patch('notifications/read-all')
  markAllNotificationsRead(@CurrentUser() user: UserEntity) {
    let count = 0;
    for (const notif of this.db.store.notifications) {
      if (notif.user_id === user.id && !notif.is_read) {
        notif.is_read = true;
        count++;
      }
    }
    this.db.save();
    return { message: 'All notifications marked as read.', count };
  }

  @Delete('notifications/clear')
  clearNotifications(@CurrentUser() user: UserEntity) {
    const before = this.db.store.notifications.length;
    this.db.store.notifications = this.db.store.notifications.filter(
      (n) => n.user_id !== user.id,
    );
    this.db.save();
    return {
      message: 'All notifications cleared.',
      deleted_count: before - this.db.store.notifications.length,
    };
  }

  @Patch('notifications/:notificationId/read')
  markNotificationRead(
    @Param('notificationId') notificationId: string,
    @CurrentUser() user: UserEntity,
  ) {
    const notif = this.db.store.notifications.find(
      (n) => n.id === notificationId && n.user_id === user.id,
    );
    if (!notif) {
      throw new NotFoundException('Notification not found');
    }
    notif.is_read = true;
    this.db.save();
    return { message: 'Notification marked as read.', notification: notif };
  }
}
