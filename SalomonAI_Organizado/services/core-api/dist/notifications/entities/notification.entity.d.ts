import { User } from '../../users/entities/user.entity';
import { NotificationChannel, NotificationSeverity } from '../interfaces/notification.types';
export declare class Notification {
    id: string;
    message: string;
    read: boolean;
    channel: NotificationChannel;
    eventType?: string;
    severity: NotificationSeverity;
    metadata?: Record<string, any>;
    user: User;
    createdAt: Date;
}
