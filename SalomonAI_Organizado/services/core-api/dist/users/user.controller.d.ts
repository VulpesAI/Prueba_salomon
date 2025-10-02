import { HttpService } from '@nestjs/axios';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { KafkaProducerService } from '../kafka/kafka.tokens';
import { QueryDto } from './dto/query.dto';
import { ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
export declare class UserController {
    private readonly userService;
    private readonly kafkaService;
    private readonly configService;
    private readonly httpService;
    private readonly logger;
    constructor(userService: UserService, kafkaService: KafkaProducerService, configService: ConfigService, httpService: HttpService);
    getProfile(user: User): {
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
            riskTolerance?: "low" | "medium" | "high";
            investmentExperience?: "none" | "basic" | "intermediate" | "advanced";
        };
        createdAt: Date;
        updatedAt: Date;
        movements: import("../financial-movements/entities/financial-movement.entity").FinancialMovement[];
        classificationRules: import("../classification-rules/entities/user-classification-rule.entity").UserClassificationRule[];
        notifications: import("../notifications/entities/notification.entity").Notification[];
        transactions: import("../transactions/entities/transaction.entity").Transaction[];
        goals: import("../goals/entities/financial-goal.entity").FinancialGoal[];
        authTokens: import("../auth/entities/auth-token.entity").AuthToken[];
    };
    updateProfile(user: User, updateUserDto: UpdateUserDto): Promise<User>;
    deleteAccount(user: User): Promise<void>;
    uploadDocument(user: User, file: Express.Multer.File): Promise<{
        message: string;
    }>;
    handleQuery(user: User, queryDto: QueryDto): Promise<any>;
    syncAccounts(user: User): Promise<{
        message: string;
    }>;
    getTaxAnalysis(user: User, year: number): Promise<any>;
    getRecommendations(user: User): Promise<{
        message: string;
    }>;
}
