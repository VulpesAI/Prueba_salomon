import { OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';
export declare class FirebaseAdminService implements OnModuleInit {
    private configService;
    private app;
    constructor(configService: ConfigService);
    onModuleInit(): void;
    getApp(): admin.app.App;
    getAuth(): admin.auth.Auth;
    verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken>;
    getUserByUid(uid: string): Promise<admin.auth.UserRecord>;
    createCustomToken(uid: string, additionalClaims?: object): Promise<string>;
}
