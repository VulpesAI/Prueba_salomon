import { OAuthService } from './oauth.service';
import { GoogleAuthorizationRequestDto, GoogleOAuthCallbackDto } from './dto/google-oauth.dto';
export declare class OAuthController {
    private readonly oauthService;
    constructor(oauthService: OAuthService);
    generateGoogleAuthorization(dto: GoogleAuthorizationRequestDto): Promise<{
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
