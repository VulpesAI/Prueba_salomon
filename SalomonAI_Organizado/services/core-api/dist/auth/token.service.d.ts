import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SiemLoggerService } from '../security/siem-logger.service';
import { User } from '../users/entities/user.entity';
import { TokenStore } from './token-store/token-store.interface';
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    tokenType: 'Bearer';
    expiresIn: number;
    refreshTokenExpiresAt: string;
}
export declare class TokenService {
    private readonly tokenStore;
    private readonly jwtService;
    private readonly configService;
    private readonly siemLogger;
    constructor(tokenStore: TokenStore, jwtService: JwtService, configService: ConfigService, siemLogger: SiemLoggerService);
    private getAccessTokenTtlSeconds;
    private getRefreshTokenTtlSeconds;
    private toTokenUser;
    private createRefreshTokenRecord;
    private verifyRefreshToken;
    private buildJwtPayload;
    generateAccessToken(user: {
        id: string;
        email: string;
        roles?: string[];
        uid?: string;
    }): Promise<{
        token: string;
        expiresInSeconds: number;
    }>;
    issueTokenPair(user: {
        id: string;
        email: string;
        roles?: string[];
        uid?: string;
    }): Promise<TokenPair>;
    rotateRefreshToken(rawToken: string): Promise<{
        user: Pick<User, 'id' | 'email' | 'roles' | 'uid'>;
        tokens: TokenPair;
    }>;
    revokeTokensForUser(userId: string): Promise<void>;
}
