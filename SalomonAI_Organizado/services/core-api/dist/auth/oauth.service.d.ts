import { ConfigService } from '@nestjs/config';
import type { Cache } from 'cache-manager';
import { TokenService } from './token.service';
import { SiemLoggerService } from '../security/siem-logger.service';
import { GoogleOAuthCallbackDto } from './dto/google-oauth.dto';
import { UserAccountsService } from '../users/interfaces/user-accounts.interface';
export declare class OAuthService {
    private readonly configService;
    private readonly userService;
    private readonly tokenService;
    private readonly siemLogger;
    private readonly cacheManager;
    constructor(configService: ConfigService, userService: UserAccountsService, tokenService: TokenService, siemLogger: SiemLoggerService, cacheManager: Cache);
    private readonly GOOGLE_STATE_CACHE_PREFIX;
    private buildGoogleStateCacheKey;
    private getGoogleClientId;
    private getGoogleClientSecret;
    private resolveRedirectUri;
    generateGoogleAuthorizationUrl(redirectUri?: string): Promise<{
        authorizationUrl: string;
        codeVerifier: string;
        codeChallenge: string;
        state: `${string}-${string}-${string}-${string}-${string}`;
    }>;
    handleGoogleCallback(dto: GoogleOAuthCallbackDto): Promise<{
        tokens: import("./token.service").TokenPair;
        user: import("../users/entities/user.entity").User;
        providerTokens: {
            accessToken: any;
            refreshToken: any;
            expiresIn: any;
            idToken: any;
        };
    }>;
}
