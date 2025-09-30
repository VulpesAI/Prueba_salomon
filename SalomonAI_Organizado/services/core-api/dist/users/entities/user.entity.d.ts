import { FinancialMovement } from '../../financial-movements/entities/financial-movement.entity';
import { UserClassificationRule } from '../../classification-rules/entities/user-classification-rule.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';
import { FinancialGoal } from '../../goals/entities/financial-goal.entity';
import { AuthToken } from '../../auth/entities/auth-token.entity';
export declare class User {
    id: string;
    uid: string;
    email: string;
    passwordHash: string;
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
    mfaEnabled: boolean;
    mfaSecret?: string | null;
    mfaTempSecret?: string | null;
    mfaBackupCodes?: string[] | null;
    lastMfaAt?: Date | null;
    oauthProviders?: {
        provider: string;
        subject: string;
        picture?: string;
        lastLoginAt?: string;
    }[];
    preferences: {
        currency?: string;
        timezone?: string;
        language?: string;
        notifications?: {
            email?: boolean;
            push?: boolean;
            sms?: boolean;
            pushTokens?: string[];
            mutedEvents?: {
                key: string;
                until?: string;
            }[];
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
        riskTolerance?: 'low' | 'medium' | 'high';
        investmentExperience?: 'none' | 'basic' | 'intermediate' | 'advanced';
    };
    createdAt: Date;
    updatedAt: Date;
    movements: FinancialMovement[];
    classificationRules: UserClassificationRule[];
    notifications: Notification[];
    transactions: Transaction[];
    goals: FinancialGoal[];
    authTokens: AuthToken[];
}
