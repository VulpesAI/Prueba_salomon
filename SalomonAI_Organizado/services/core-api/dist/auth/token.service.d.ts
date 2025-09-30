import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthToken } from './entities/auth-token.entity';
import { SiemLoggerService } from '../security/siem-logger.service';
import { User } from '../users/entities/user.entity';
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    tokenType: 'Bearer';
    expiresIn: number;
    refreshTokenExpiresAt: string;
}
export declare class TokenService {
    private readonly authTokenRepository;
    private readonly jwtService;
    private readonly configService;
    private readonly siemLogger;
    constructor(authTokenRepository: Repository<AuthToken>, jwtService: JwtService, configService: ConfigService, siemLogger: SiemLoggerService);
    private getAccessTokenTtlSeconds;
    private getRefreshTokenTtlSeconds;
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
        user: User;
        tokens: TokenPair;
    }>;
    revokeTokensForUser(userId: string): Promise<void>;
}
