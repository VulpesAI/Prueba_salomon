import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
export declare class FirebasePushProvider {
    private readonly firebaseAdmin;
    private readonly logger;
    constructor(firebaseAdmin: FirebaseAdminService);
    sendPush(token: string, title: string, body: string, data?: Record<string, string>): Promise<boolean>;
}
