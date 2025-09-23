import { JwtService } from '@nestjs/jwt';
import { UserService } from '../users/user.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
export declare class AuthService {
    private readonly userService;
    private readonly jwtService;
    constructor(userService: UserService, jwtService: JwtService);
    validateUser(email: string, pass: string): Promise<any>;
    login(user: {
        email: string;
        id: string;
    }): Promise<{
        access_token: string;
    }>;
    generateJwtToken(payload: {
        id: string;
        email: string;
        uid?: string;
        roles?: string[];
    }): Promise<string>;
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
        accounts: import("../transactions/entities/financial-account.entity").FinancialAccount[];
    }>;
}
