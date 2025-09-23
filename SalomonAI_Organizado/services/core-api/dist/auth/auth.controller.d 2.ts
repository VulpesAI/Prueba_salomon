import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { FirebaseAdminService } from '../firebase/firebase-admin.service';
import { UsersService } from '../users/users.service';
export declare class AuthController {
    private readonly authService;
    private readonly firebaseAdminService;
    private readonly usersService;
    constructor(authService: AuthService, firebaseAdminService: FirebaseAdminService, usersService: UsersService);
    register(createUserDto: CreateUserDto): Promise<{
        id: string;
        uid: string;
        email: string;
        fullName: string;
        displayName: string;
        photoURL: string;
        emailVerified: boolean;
        phoneNumber: string;
        metadata: {
            creationTime?: string;
            lastSignInTime?: string;
        };
        roles: string[];
        isActive: boolean;
        preferences: {
            currency?: string;
            timezone?: string;
            language?: string;
            notifications?: {
                email?: boolean;
                push?: boolean;
                sms?: boolean;
            };
            privacy?: {
                shareData?: boolean;
                analytics?: boolean;
            };
        };
        profile: {
            dateOfBirth?: string;
            occupation?: string;
            income?: number;
            financialGoals?: string[];
            riskTolerance?: "low" | "medium" | "high";
            investmentExperience?: "none" | "basic" | "intermediate" | "advanced";
        };
        createdAt: Date;
        updatedAt: Date;
        movements: import("../financial-movements/entities/financial-movement.entity").FinancialMovement[];
        classificationRules: import("../classification-rules/entities/user-classification-rule.entity").UserClassificationRule[];
        notifications: import("../notifications/entities/notification.entity").Notification[];
        transactions: import("../transactions/entities/transaction.entity").Transaction[];
    }>;
    login(req: any): Promise<{
        access_token: string;
    }>;
    firebaseLogin(authHeader: string): Promise<{
        access_token: string;
        user: {
            id: string;
            uid: string;
            email: string;
            displayName: string;
            photoURL: string;
            emailVerified: boolean;
            phoneNumber: string;
            roles: string[];
            preferences: {
                currency?: string;
                timezone?: string;
                language?: string;
                notifications?: {
                    email?: boolean;
                    push?: boolean;
                    sms?: boolean;
                };
                privacy?: {
                    shareData?: boolean;
                    analytics?: boolean;
                };
            };
        };
    }>;
    verifyFirebaseToken(authHeader: string): Promise<{
        valid: boolean;
        uid: string;
        user: {
            id: string;
            email: string;
            displayName: string;
            photoURL: string;
            emailVerified: boolean;
            roles: string[];
        };
        error?: undefined;
    } | {
        valid: boolean;
        error: string;
        uid?: undefined;
        user?: undefined;
    }>;
}
