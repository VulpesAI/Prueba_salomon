import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { FirebaseAdminService } from '../firebase/firebase-admin.service';
import { UsersService } from '../users/users.service';
import { VerifyMfaDto } from './dto/verify-mfa.dto';
import { DisableMfaDto } from './dto/disable-mfa.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LoginUserDto } from './dto/login-user.dto';
export declare class AuthController {
    private readonly authService;
    private readonly firebaseAdminService;
    private readonly usersService;
    constructor(authService: AuthService, firebaseAdminService: FirebaseAdminService, usersService: UsersService);
    register(createUserDto: CreateUserDto): Promise<any>;
    login(req: any, _loginDto: LoginUserDto): Promise<{
        user: {
            id: string;
            email: string;
            roles?: string[];
            mfaEnabled?: boolean;
        };
        accessToken: string;
        refreshToken: string;
        tokenType: "Bearer";
        expiresIn: number;
        refreshTokenExpiresAt: string;
    }>;
    refreshTokens(dto: RefreshTokenDto): Promise<import("./token.service").TokenPair & {
        user: any;
    }>;
    setupMfa(req: any): Promise<{
        secret: string;
        otpauthUrl: string;
    }>;
    verifyMfa(req: any, dto: VerifyMfaDto): Promise<{
        backupCodes: string[];
    }>;
    disableMfa(req: any, dto: DisableMfaDto): Promise<{
        message: string;
    }>;
    firebaseLogin(authHeader: string): Promise<{
        access_token: string;
        user: {
            id: string;
            email: string;
            roles?: string[];
            mfaEnabled?: boolean;
        };
        accessToken: string;
        refreshToken: string;
        tokenType: "Bearer";
        expiresIn: number;
        refreshTokenExpiresAt: string;
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
