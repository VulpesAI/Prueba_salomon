import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  FIREBASE_ADMIN_SERVICE,
  FirebaseAdminServiceInterface,
} from '../../firebase/firebase-admin.interface';

@Injectable()
export class FirebasePushProvider {
  private readonly logger = new Logger(FirebasePushProvider.name);

  constructor(
    @Inject(FIREBASE_ADMIN_SERVICE)
    private readonly firebaseAdmin: FirebaseAdminServiceInterface,
  ) {}

  async sendPush(token: string, title: string, body: string, data?: Record<string, string>): Promise<boolean> {
    if (!token) {
      this.logger.warn('Missing FCM device token, skipping push notification.');
      return false;
    }

    if (!this.firebaseAdmin.isEnabled()) {
      this.logger.warn('Firebase Admin is disabled. Skipping push notification dispatch.');
      return false;
    }

    try {
      await this.firebaseAdmin.sendMessage({
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
