import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class NoopFirebaseAdminService implements OnModuleInit {
  private readonly logger = new Logger(NoopFirebaseAdminService.name);

  onModuleInit() {
    this.logger.warn('Firebase Admin is disabled. Using NoopFirebaseAdminService.');
  }

  private throwDisabledError(): never {
    throw new Error('Firebase Admin is disabled in the current runtime profile.');
  }

  // The following methods keep the same signature as FirebaseAdminService so consumers can
  // depend on the provider without additional guards. They throw when invoked to signal that
  // Firebase is not available in the current profile.

  getApp(): admin.app.App {
    return this.throwDisabledError();
  }

  getAuth(): admin.auth.Auth {
    return this.throwDisabledError();
  }

  getMessaging(): admin.messaging.Messaging {
    return this.throwDisabledError();
  }

  async verifyIdToken(_idToken: string): Promise<admin.auth.DecodedIdToken> {
    return this.throwDisabledError();
  }

  async getUserByUid(_uid: string): Promise<admin.auth.UserRecord> {
    return this.throwDisabledError();
  }

  async createCustomToken(_uid: string, _additionalClaims?: object): Promise<string> {
    return this.throwDisabledError();
  }
}

