import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { FirebaseAdminService } from '../firebase/firebase-admin.service';
import { UserDirectoryService } from '../users/interfaces/user-directory.interface';
declare const FirebaseAuthStrategy_base: new (...args: any[]) => Strategy;
export declare class FirebaseAuthStrategy extends FirebaseAuthStrategy_base {
    private firebaseAdminService;
    private usersService;
    private configService;
    constructor(firebaseAdminService: FirebaseAdminService, usersService: UserDirectoryService, configService: ConfigService);
    validate(req: any, payload: any): Promise<{
        id: string;
        uid: string;
        email: string;
        displayName: string;
        emailVerified: boolean;
        roles: string[];
    }>;
}
export {};
