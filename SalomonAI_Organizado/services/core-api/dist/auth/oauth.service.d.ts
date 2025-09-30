import { ConfigService } from '@nestjs/config';
import { UserService } from '../users/user.service';
import { TokenService } from './token.service';
import { SiemLoggerService } from '../security/siem-logger.service';
import { GoogleOAuthCallbackDto } from './dto/google-oauth.dto';
export declare class OAuthService {
    private readonly configService;
    private readonly userService;
    private readonly tokenService;
    private readonly siemLogger;
    constructor(configService: ConfigService, userService: UserService, tokenService: TokenService, siemLogger: SiemLoggerService);
    private getGoogleClientId;
    private getGoogleClientSecret;
    private resolveRedirectUri;
    generateGoogleAuthorizationUrl(redirectUri?: string): {
        authorizationUrl: string;
        codeVerifier: string;
        codeChallenge: string;
        state: `${string}-${string}-${string}-${string}-${string}`;
    };
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
