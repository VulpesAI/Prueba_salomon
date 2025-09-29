import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { AlertOrchestratorService, DispatchAlertOptions } from '../alerts/alert-orchestrator.service';
import { NotificationChannel } from './interfaces/notification.types';

export interface UserNotificationPreferences {
  email?: boolean;
  push?: boolean;
  sms?: boolean;
  mutedEvents?: { key: string; until?: string }[];
  pushTokens?: string[];
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly alertOrchestrator: AlertOrchestratorService,
  ) {}

  async createNotification(user: User, message: string, options: Partial<DispatchAlertOptions> = {}): Promise<Notification | null> {
    return this.alertOrchestrator.dispatchAlert({
      user,
      message,
      title: options.title,
      channels: options.channels,
      eventType: options.eventType ?? 'manual-notification',
      metadata: options.metadata,
      data: options.data,
      severity: options.severity ?? 'info',
    });
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.notificationRepository.update(
      { id: notificationId, user: { id: userId } },
      { read: true },
    );
  }

  async getHistory(userId: string, limit = 50, channel?: NotificationChannel): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: {
        user: { id: userId },
        ...(channel ? { channel } : {}),
      },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getPreferences(userId: string): Promise<UserNotificationPreferences> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.normalizePreferences(user);
  }

  async updatePreferences(userId: string, updates: Partial<UserNotificationPreferences>): Promise<UserNotificationPreferences> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const preferences = this.normalizePreferences(user);
    const merged: UserNotificationPreferences = {
      ...preferences,
      ...updates,
      pushTokens: updates.pushTokens ? Array.from(new Set(updates.pushTokens)) : preferences.pushTokens,
    };

    user.preferences = {
      ...(user.preferences ?? {}),
      notifications: merged,
    } as any;

    await this.userRepository.save(user);
    return merged;
  }

  async muteEvent(userId: string, eventKey: string, until?: string): Promise<UserNotificationPreferences> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const preferences = this.normalizePreferences(user);
    const mutedEvents = (preferences.mutedEvents ?? []).filter((entry) => entry.key !== eventKey);
    mutedEvents.push({ key: eventKey, until });

    preferences.mutedEvents = mutedEvents;
    user.preferences = {
      ...(user.preferences ?? {}),
      notifications: preferences,
    } as any;

    await this.userRepository.save(user);
    return preferences;
  }

  async unmuteEvent(userId: string, eventKey: string): Promise<UserNotificationPreferences> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const preferences = this.normalizePreferences(user);
    preferences.mutedEvents = (preferences.mutedEvents ?? []).filter((entry) => entry.key !== eventKey);

    user.preferences = {
      ...(user.preferences ?? {}),
      notifications: preferences,
    } as any;

    await this.userRepository.save(user);
    return preferences;
  }

  private normalizePreferences(user: User): UserNotificationPreferences {
    const defaults: UserNotificationPreferences = {
      email: true,
      push: false,
      sms: false,
      pushTokens: [],
      mutedEvents: [],
    };

    return {
      ...defaults,
      ...(user.preferences?.notifications ?? {}),
      pushTokens: Array.from(new Set([...(user.preferences?.notifications?.pushTokens ?? [])])),
      mutedEvents: [...(user.preferences?.notifications?.mutedEvents ?? [])],
    };
  }
}