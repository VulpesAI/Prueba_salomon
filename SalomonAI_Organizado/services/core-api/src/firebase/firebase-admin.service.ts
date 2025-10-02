import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private app: admin.app.App;
  private readonly logger = new Logger(FirebaseAdminService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    // Inicializar Firebase Admin
    if (!admin.apps.length) {
      const serviceAccount = this.configService.get('FIREBASE_SERVICE_ACCOUNT_KEY');

      try {
        this.logger.log('Inicializando Firebase Admin: parseando secreto de servicio');
        const credentials = (serviceAccount
          ? JSON.parse(serviceAccount)
          : {
              type: 'service_account',
              project_id: this.configService.get('FIREBASE_PROJECT_ID'),
              private_key_id: this.configService.get('FIREBASE_PRIVATE_KEY_ID'),
              private_key: this.configService.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
              client_email: this.configService.get('FIREBASE_CLIENT_EMAIL'),
              client_id: this.configService.get('FIREBASE_CLIENT_ID'),
              auth_uri: 'https://accounts.google.com/o/oauth2/auth',
              token_uri: 'https://oauth2.googleapis.com/token',
              auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
              client_x509_cert_url: this.configService.get('FIREBASE_CLIENT_CERT_URL'),
            }) as admin.ServiceAccount;
        this.logger.log('Credenciales de Firebase Admin obtenidas correctamente');

        this.app = admin.initializeApp({
          credential: admin.credential.cert(credentials),
          databaseURL: this.configService.get('FIREBASE_DATABASE_URL'),
        });
        this.logger.log('Firebase Admin inicializado correctamente');
      } catch (error) {
        this.logger.error('Error al inicializar Firebase Admin', error instanceof Error ? error.stack : error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Fallo inicializando Firebase Admin: ${errorMessage}`);
      }
    } else {
      this.app = admin.apps[0];
    }
  }

  getApp(): admin.app.App {
    return this.app;
  }

  getAuth(): admin.auth.Auth {
    return this.app.auth();
  }

  getMessaging(): admin.messaging.Messaging {
    return this.app.messaging();
  }

  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    try {
      return await this.getAuth().verifyIdToken(idToken);
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  async getUserByUid(uid: string): Promise<admin.auth.UserRecord> {
    try {
      return await this.getAuth().getUser(uid);
    } catch (error) {
      throw new Error(`User not found: ${error.message}`);
    }
  }

  async createCustomToken(uid: string, additionalClaims?: object): Promise<string> {
    try {
      return await this.getAuth().createCustomToken(uid, additionalClaims);
    } catch (error) {
      throw new Error(`Custom token creation failed: ${error.message}`);
    }
  }
}
