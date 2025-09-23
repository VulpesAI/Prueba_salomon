import { NotificationsService } from './notifications.service';
import { User } from '../users/entities/user.entity';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    findAllByUser(user: User): Promise<import("./entities/notification.entity").Notification[]>;
    markAsRead(user: User, notificationId: string): Promise<void>;
}
