import { CreateUserDto } from '../users/dto/create-user.dto';
import { TokenService, TokenPair } from './token.service';
import { SiemLoggerService } from '../security/siem-logger.service';
import { UserAccountsService } from '../users/interfaces/user-accounts.interface';
export declare class AuthService {
    private readonly userService;
    private readonly tokenService;
    private readonly siemLogger;
    constructor(userService: UserAccountsService, tokenService: TokenService, siemLogger: SiemLoggerService);
    private sanitizeUser;
    private ensureActiveUser;
    validateUser(email: string, password: string, mfaToken?: string): Promise<any>;
    login(user: {
        id: string;
        email: string;
        roles?: string[];
        mfaEnabled?: boolean;
        isActive?: boolean;
        uid?: string;
    }): Promise<{
        user: {
            id: string;
            email: string;
            roles?: string[];
            mfaEnabled?: boolean;
            isActive?: boolean;
            uid?: string;
        };
        accessToken: string;
        refreshToken: string;
        tokenType: "Bearer";
        expiresIn: number;
        refreshTokenExpiresAt: string;
    }>;
    generateJwtToken(payload: {
        id: string;
        email: string;
        uid?: string;
        roles?: string[];
    }): Promise<string>;
    register(createUserDto: CreateUserDto): Promise<any>;
    initiateMfaEnrollment(userId: string): Promise<{
        secret: string;
        otpauthUrl: string;
    }>;
    verifyMfaEnrollment(userId: string, token: string): Promise<{
        backupCodes: string[];
    }>;
    disableMfa(userId: string, token?: string, backupCode?: string): Promise<void>;
    refreshTokens(refreshToken: string): Promise<TokenPair & {
        user: any;
    }>;
}
