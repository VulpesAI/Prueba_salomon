import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async createNotification(user: User, message: string): Promise<Notification> {
    const notification = this.notificationRepository.create({
      message,
      user, // Pass the full user entity
    });
    return this.notificationRepository.save(notification);
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    // Actualiza la notificación solo si el ID de la notificación y el ID del usuario coinciden.
    await this.notificationRepository.update(
      { id: notificationId, user: { id: userId } },
      { read: true },
    );
  }

  async findAllByUser(userId: string): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }
}