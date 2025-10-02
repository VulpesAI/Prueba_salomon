import * as admin from 'firebase-admin';

export interface FirebaseAdminServiceInterface {
  isEnabled(): boolean;
  verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken>;
  getUserByUid(uid: string): Promise<admin.auth.UserRecord>;
  createCustomToken(uid: string, additionalClaims?: object): Promise<string>;
  sendMessage(message: admin.messaging.Message): Promise<string>;
}

export const FIREBASE_ADMIN_SERVICE = Symbol('FIREBASE_ADMIN_SERVICE');

