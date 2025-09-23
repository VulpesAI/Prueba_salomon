import { FinancialMovement } from '../../financial-movements/entities/financial-movement.entity';
import { UserClassificationRule } from '../../classification-rules/entities/user-classification-rule.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';
import { FinancialAccount } from '../../financial-accounts/entities/financial-account.entity';
import { BankConnection } from '../../belvo/entities/bank-connection.entity';
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
        riskTolerance?: 'low' | 'medium' | 'high';
        investmentExperience?: 'none' | 'basic' | 'intermediate' | 'advanced';
    };
    createdAt: Date;
    updatedAt: Date;
    movements: FinancialMovement[];
    classificationRules: UserClassificationRule[];
    notifications: Notification[];
    transactions: Transaction[];
    accounts: FinancialAccount[];
    bankConnections: BankConnection[];
}
