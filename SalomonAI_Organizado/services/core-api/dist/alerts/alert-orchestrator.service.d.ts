import { Repository } from 'typeorm';
import { Notification } from '../notifications/entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { NotificationChannel, NotificationSeverity } from '../notifications/interfaces/notification.types';
import { SendGridEmailProvider } from './providers/sendgrid-email.provider';
import { FirebasePushProvider } from './providers/firebase-push.provider';
import { TwilioSmsProvider } from './providers/twilio-sms.provider';
export interface DispatchAlertOptions {
    user: User;
    title?: string;
    message: string;
    eventType?: string;
    channels?: NotificationChannel[];
    severity?: NotificationSeverity;
    metadata?: Record<string, any>;
    data?: Record<string, string>;
}
export declare class AlertOrchestratorService {
    private readonly notificationRepository;
    private readonly emailProvider;
    private readonly pushProvider;
    private readonly smsProvider;
    private readonly logger;
    constructor(notificationRepository: Repository<Notification>, emailProvider: SendGridEmailProvider, pushProvider: FirebasePushProvider, smsProvider: TwilioSmsProvider);
    dispatchAlert(options: DispatchAlertOptions): Promise<Notification | null>;
    private resolveChannels;
    private dispatchToChannel;
    private sendEmail;
    private sendPush;
    private sendSms;
    private isMuted;
}
