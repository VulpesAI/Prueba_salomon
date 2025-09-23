import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
export declare class NotificationsService {
    private readonly notificationRepository;
    constructor(notificationRepository: Repository<Notification>);
    createNotification(user: User, message: string): Promise<Notification>;
    markAsRead(notificationId: string, userId: string): Promise<void>;
    findAllByUser(userId: string): Promise<Notification[]>;
}
