import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, cert, deleteApp, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

@Injectable()
export class FirebaseAdminService implements OnModuleDestroy {
  private readonly logger = new Logger(FirebaseAdminService.name);
  private app: App | null = null;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>('firebase.enabled') ?? false;

    if (!this.enabled) {
      this.logger.log('Firebase Admin is disabled. Skipping initialization.');
      return;
    }

    try {
      this.app = this.initializeFirebaseApp();
      this.logger.log('Firebase Admin initialized successfully.');
    } catch (error) {
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Failed to initialize Firebase Admin SDK', stack);
      this.app = null;
    }
  }

  isEnabled(): boolean {
    return this.enabled && this.app !== null;
  }

  private initializeFirebaseApp(): App {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      return getApp();
    }

    const serviceAccountKey = this.configService.get<string>('firebase.serviceAccountKey');

    if (serviceAccountKey) {
      const parsed = JSON.parse(serviceAccountKey);
      parsed.private_key = (parsed.private_key as string).replace(/\\n/g, '\n');

      return initializeApp({
        credential: cert(parsed),
        databaseURL: parsed.databaseURL ?? this.configService.get<string>('firebase.databaseURL')
      });
    }

    const projectId = this.configService.get<string>('firebase.projectId');
    const clientEmail = this.configService.get<string>('firebase.clientEmail');
    const privateKey = this.configService.get<string>('firebase.privateKey');
    const databaseURL = this.configService.get<string>('firebase.databaseURL');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Missing Firebase credentials');
    }

    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey
      }),
      databaseURL
    });
  }

  async verifyIdToken(token: string) {
    if (!this.isEnabled()) {
      throw new Error('Firebase Admin is disabled');
    }

    const auth = getAuth(this.app!);
    return auth.verifyIdToken(token, true);
  }

  async getUser(uid: string) {
    if (!this.isEnabled()) {
      throw new Error('Firebase Admin is disabled');
    }

    const auth = getAuth(this.app!);
    return auth.getUser(uid);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.app) {
      await deleteApp(this.app);
      this.app = null;
    }
  }
}
