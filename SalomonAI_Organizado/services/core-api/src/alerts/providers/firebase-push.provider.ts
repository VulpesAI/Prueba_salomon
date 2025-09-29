import { Injectable, Logger } from '@nestjs/common';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';

@Injectable()
export class FirebasePushProvider {
  private readonly logger = new Logger(FirebasePushProvider.name);

  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  async sendPush(token: string, title: string, body: string, data?: Record<string, string>): Promise<boolean> {
    if (!token) {
      this.logger.warn('Missing FCM device token, skipping push notification.');
      return false;
    }

    try {
      await this.firebaseAdmin.getMessaging().send({
        token,
        notification: { title, body },
        data,
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`FCM push dispatch failed: ${message}`);
      return false;
    }
  }
}
