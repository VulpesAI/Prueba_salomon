import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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

interface UserNotificationPreferences {
  email?: boolean;
  push?: boolean;
  sms?: boolean;
  mutedEvents?: { key: string; until?: string }[];
  pushTokens?: string[];
}

@Injectable()
export class AlertOrchestratorService {
  private readonly logger = new Logger(AlertOrchestratorService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly emailProvider: SendGridEmailProvider,
    private readonly pushProvider: FirebasePushProvider,
    private readonly smsProvider: TwilioSmsProvider,
  ) {}

  async dispatchAlert(options: DispatchAlertOptions): Promise<Notification | null> {
    const {
      user,
      message,
      title,
      eventType,
      channels = ['in_app'],
      severity = 'info',
      metadata,
      data,
    } = options;

    const preferences = (user.preferences?.notifications ?? {}) as UserNotificationPreferences;

    if (eventType && this.isMuted(preferences.mutedEvents ?? [], eventType)) {
      this.logger.debug(`Skipping alert for muted event ${eventType} and user ${user.id}`);
      return null;
    }

    const allowedChannels = this.resolveChannels(channels, preferences);

    const notification = this.notificationRepository.create({
      user,
      message,
      channel: 'in_app',
      eventType: eventType ?? null,
      severity,
      metadata: {
        ...(metadata ?? {}),
        dispatchedChannels: allowedChannels,
        title,
      },
    });

    const saved = await this.notificationRepository.save(notification);

    await Promise.all(
      allowedChannels
        .filter((channel) => channel !== 'in_app')
        .map((channel) => this.dispatchToChannel(channel, user, title ?? 'Nueva alerta financiera', message, data ?? {})),
    );

    return saved;
  }

  private resolveChannels(
    requested: NotificationChannel[],
    preferences: UserNotificationPreferences,
  ): NotificationChannel[] {
    const unique = Array.from(new Set<NotificationChannel>([...requested, 'in_app']));
    return unique.filter((channel) => {
      switch (channel) {
        case 'email':
          return preferences.email !== false;
        case 'push':
          return preferences.push === true;
        case 'sms':
          return preferences.sms === true;
        case 'in_app':
        default:
          return true;
      }
    });
  }

  private async dispatchToChannel(
    channel: NotificationChannel,
    user: User,
    title: string,
    message: string,
    data: Record<string, string>,
  ): Promise<boolean> {
    switch (channel) {
      case 'email':
        return this.sendEmail(user, title, message);
      case 'push':
        return this.sendPush(user, title, message, data);
      case 'sms':
        return this.sendSms(user, message);
      default:
        return true;
    }
  }

  private async sendEmail(user: User, subject: string, message: string): Promise<boolean> {
    if (!user.email) {
      this.logger.warn(`User ${user.id} lacks email for email notifications.`);
      return false;
    }

    return this.emailProvider.sendEmail(user.email, subject, message);
  }

  private async sendPush(user: User, title: string, body: string, data: Record<string, string>): Promise<boolean> {
    const preferences = (user.preferences?.notifications ?? {}) as UserNotificationPreferences;
    const tokens = preferences.pushTokens ?? [];

    if (tokens.length === 0) {
      this.logger.warn(`User ${user.id} has no registered push tokens.`);
      return false;
    }

    const results = await Promise.all(tokens.map((token) => this.pushProvider.sendPush(token, title, body, data)));
    return results.some((result) => result);
  }

  private async sendSms(user: User, message: string): Promise<boolean> {
    if (!user.phoneNumber) {
      this.logger.warn(`User ${user.id} lacks phone number for SMS notifications.`);
      return false;
    }

    return this.smsProvider.sendSms(user.phoneNumber, message);
  }

  private isMuted(mutedEvents: { key: string; until?: string }[], eventKey: string): boolean {
    const now = new Date();
    return mutedEvents.some((entry) => {
      if (entry.key !== eventKey) {
        return false;
      }

      if (!entry.until) {
        return true;
      }

      const untilDate = new Date(entry.until);
      return untilDate.getTime() > now.getTime();
    });
  }
}
