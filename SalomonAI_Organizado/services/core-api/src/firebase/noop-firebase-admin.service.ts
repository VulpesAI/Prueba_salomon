import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseAdminServiceInterface } from './firebase-admin.interface';

@Injectable()
export class NoopFirebaseAdminService
  implements OnModuleInit, FirebaseAdminServiceInterface
{
  private readonly logger = new Logger(NoopFirebaseAdminService.name);

  onModuleInit() {
    this.logger.warn('Firebase Admin is disabled. Using NoopFirebaseAdminService.');
  }

  isEnabled(): boolean {
    return false;
  }

  private throwDisabledError(method: string): never {
    this.logger.warn(
      `Firebase Admin is disabled. Attempted to call "${method}" on NoopFirebaseAdminService.`,
    );
    throw new Error('Firebase Admin is disabled in the current runtime profile.');
  }

  // The following methods keep the same signature as FirebaseAdminService so consumers can
  // depend on the provider without additional guards. They throw when invoked to signal that
  // Firebase is not available in the current profile.

  getApp(): admin.app.App {
    return this.throwDisabledError('getApp');
  }

  getAuth(): admin.auth.Auth {
    return this.throwDisabledError('getAuth');
  }

  getMessaging(): admin.messaging.Messaging {
    return this.throwDisabledError('getMessaging');
  }

  async verifyIdToken(_idToken: string): Promise<admin.auth.DecodedIdToken> {
    return this.throwDisabledError('verifyIdToken');
  }

  async getUserByUid(_uid: string): Promise<admin.auth.UserRecord> {
    return this.throwDisabledError('getUserByUid');
  }

  async createCustomToken(_uid: string, _additionalClaims?: object): Promise<string> {
    return this.throwDisabledError('createCustomToken');
  }

  async sendMessage(_message: admin.messaging.Message): Promise<string> {
    return this.throwDisabledError('sendMessage');
  }
}

