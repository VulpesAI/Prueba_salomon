import { NotificationsService } from './notifications.service';
import { User } from '../users/entities/user.entity';
import { NotificationHistoryQueryDto } from './dto/notification-history-query.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { MuteNotificationDto } from './dto/mute-notification.dto';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    getNotifications(user: User, query: NotificationHistoryQueryDto): Promise<import("./entities/notification.entity").Notification[]>;
    markAsRead(user: User, notificationId: string): Promise<void>;
    getPreferences(user: User): Promise<import("./notifications.service").UserNotificationPreferences>;
    updatePreferences(user: User, body: UpdateNotificationPreferencesDto): Promise<import("./notifications.service").UserNotificationPreferences>;
    muteEvent(user: User, body: MuteNotificationDto): Promise<import("./notifications.service").UserNotificationPreferences>;
    unmuteEvent(user: User, eventKey: string): Promise<import("./notifications.service").UserNotificationPreferences>;
}
