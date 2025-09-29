import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { NotificationHistoryQueryDto } from './dto/notification-history-query.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { MuteNotificationDto } from './dto/mute-notification.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  getNotifications(@GetUser() user: User, @Query() query: NotificationHistoryQueryDto) {
    const limit = query.limit ?? 50;
    return this.notificationsService.getHistory(user.id, limit, query.channel);
  }

  @Patch(':id/read')
  markAsRead(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) notificationId: string,
  ) {
    return this.notificationsService.markAsRead(notificationId, user.id);
  }

  @Get('preferences')
  getPreferences(@GetUser() user: User) {
    return this.notificationsService.getPreferences(user.id);
  }

  @Patch('preferences')
  updatePreferences(
    @GetUser() user: User,
    @Body() body: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationsService.updatePreferences(user.id, body);
  }

  @Post('mute')
  muteEvent(@GetUser() user: User, @Body() body: MuteNotificationDto) {
    return this.notificationsService.muteEvent(user.id, body.eventKey, body.until);
  }

  @Delete('mute/:eventKey')
  unmuteEvent(@GetUser() user: User, @Param('eventKey') eventKey: string) {
    return this.notificationsService.unmuteEvent(user.id, eventKey);
  }
}