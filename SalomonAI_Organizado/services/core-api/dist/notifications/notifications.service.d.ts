import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { AlertOrchestratorService, DispatchAlertOptions } from '../alerts/alert-orchestrator.service';
import { NotificationChannel } from './interfaces/notification.types';
export interface UserNotificationPreferences {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
    mutedEvents?: {
        key: string;
        until?: string;
    }[];
    pushTokens?: string[];
}
export declare class NotificationsService {
    private readonly notificationRepository;
    private readonly userRepository;
    private readonly alertOrchestrator;
    constructor(notificationRepository: Repository<Notification>, userRepository: Repository<User>, alertOrchestrator: AlertOrchestratorService);
    createNotification(user: User, message: string, options?: Partial<DispatchAlertOptions>): Promise<Notification | null>;
    markAsRead(notificationId: string, userId: string): Promise<void>;
    getHistory(userId: string, limit?: number, channel?: NotificationChannel): Promise<Notification[]>;
    getPreferences(userId: string): Promise<UserNotificationPreferences>;
    updatePreferences(userId: string, updates: Partial<UserNotificationPreferences>): Promise<UserNotificationPreferences>;
    muteEvent(userId: string, eventKey: string, until?: string): Promise<UserNotificationPreferences>;
    unmuteEvent(userId: string, eventKey: string): Promise<UserNotificationPreferences>;
    private normalizePreferences;
}
