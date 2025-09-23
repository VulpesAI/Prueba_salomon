import { Strategy } from 'passport-jwt';
import { FirebaseAdminService } from '../firebase/firebase-admin.service';
import { UsersService } from '../users/users.service';
declare const FirebaseAuthStrategy_base: new (...args: any[]) => Strategy;
export declare class FirebaseAuthStrategy extends FirebaseAuthStrategy_base {
    private firebaseAdminService;
    private usersService;
    constructor(firebaseAdminService: FirebaseAdminService, usersService: UsersService);
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
