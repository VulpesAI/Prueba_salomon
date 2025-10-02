"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuthService = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
const crypto_1 = require("crypto");
const token_service_1 = require("./token.service");
const siem_logger_service_1 = require("../security/siem-logger.service");
const user_accounts_interface_1 = require("../users/interfaces/user-accounts.interface");
const GOOGLE_AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo';
const base64UrlEncode = (buffer) => buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
let OAuthService = class OAuthService {
    constructor(configService, userService, tokenService, siemLogger, cacheManager) {
        this.configService = configService;
        this.userService = userService;
        this.tokenService = tokenService;
        this.siemLogger = siemLogger;
        this.cacheManager = cacheManager;
        this.GOOGLE_STATE_CACHE_PREFIX = 'oauth:google:';
    }
    buildGoogleStateCacheKey(state) {
        return `${this.GOOGLE_STATE_CACHE_PREFIX}${state}`;
    }
    getGoogleClientId() {
        const clientId = this.configService.get('GOOGLE_CLIENT_ID');
        if (!clientId) {
            throw new common_1.InternalServerErrorException('GOOGLE_CLIENT_ID no está configurado.');
        }
        return clientId;
    }
    getGoogleClientSecret() {
        const clientSecret = this.configService.get('GOOGLE_CLIENT_SECRET');
        if (!clientSecret) {
            throw new common_1.InternalServerErrorException('GOOGLE_CLIENT_SECRET no está configurado.');
        }
        return clientSecret;
    }
    resolveRedirectUri(override) {
        return override ?? this.configService.get('GOOGLE_OAUTH_REDIRECT_URI', 'http://localhost:3000/auth/google/callback');
    }
    async generateGoogleAuthorizationUrl(redirectUri) {
        const verifier = base64UrlEncode((0, crypto_1.randomBytes)(32));
        const challenge = base64UrlEncode((0, crypto_1.createHash)('sha256').update(verifier).digest());
        const state = (0, crypto_1.randomUUID)();
        await this.cacheManager.set(this.buildGoogleStateCacheKey(state), { codeVerifier: verifier }, 5 * 60 * 1000);
        const params = new URLSearchParams({
            client_id: this.getGoogleClientId(),
            redirect_uri: this.resolveRedirectUri(redirectUri),
            response_type: 'code',
            scope: 'openid email profile',
            code_challenge: challenge,
            code_challenge_method: 'S256',
            state,
            access_type: 'offline',
            prompt: 'consent',
        });
        return {
            authorizationUrl: `${GOOGLE_AUTHORIZATION_ENDPOINT}?${params.toString()}`,
            codeVerifier: verifier,
            codeChallenge: challenge,
            state,
        };
    }
    async handleGoogleCallback(dto) {
        if (!dto.state) {
            throw new common_1.BadRequestException('El estado de OAuth es requerido.');
        }
        const cacheKey = this.buildGoogleStateCacheKey(dto.state);
        const cached = await this.cacheManager.get(cacheKey);
        if (!cached || cached.codeVerifier !== dto.codeVerifier) {
            throw new common_1.BadRequestException('El estado de OAuth es inválido o ha expirado.');
        }
        await this.cacheManager.del(cacheKey);
        const codeVerifier = cached.codeVerifier;
        const redirectUri = this.resolveRedirectUri(dto.redirectUri);
        let tokenResponse;
        try {
            tokenResponse = await axios_1.default.post(GOOGLE_TOKEN_ENDPOINT, new URLSearchParams({
                client_id: this.getGoogleClientId(),
                client_secret: this.getGoogleClientSecret(),
                code: dto.code,
                code_verifier: codeVerifier,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri,
            }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        }
        catch (error) {
            throw new common_1.InternalServerErrorException('No fue posible intercambiar el código de autorización con Google.');
        }
        if (!tokenResponse.data?.access_token) {
            throw new common_1.InternalServerErrorException('No se recibió access_token desde Google.');
        }
        let userInfoResponse;
        try {
            userInfoResponse = await axios_1.default.get(GOOGLE_USERINFO_ENDPOINT, {
                headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` },
            });
        }
        catch (error) {
            throw new common_1.InternalServerErrorException('No fue posible obtener el perfil de usuario desde Google.');
        }
        const profile = userInfoResponse.data;
        const user = await this.userService.upsertOAuthUser({
            email: profile.email,
            fullName: profile.name,
            displayName: profile.given_name ?? profile.name,
            picture: profile.picture,
            provider: 'google',
            subject: profile.sub,
        });
        if (user.isActive === false) {
            await Promise.all([
                this.tokenService.revokeTokensForUser(user.id),
                this.siemLogger.logSecurityEvent({
                    type: 'AUTH_OAUTH_BLOCKED',
                    severity: 'high',
                    userId: user.id,
                    metadata: { provider: 'google', subject: profile.sub, reason: 'USER_INACTIVE' },
                }),
            ]);
            throw new common_1.UnauthorizedException('Cuenta desactivada');
        }
        const tokens = await this.tokenService.issueTokenPair({
            id: user.id,
            email: user.email,
            roles: user.roles,
            uid: user.uid,
        });
        await this.siemLogger.logSecurityEvent({
            type: 'AUTH_OAUTH_SUCCESS',
            severity: 'medium',
            userId: user.id,
            metadata: { provider: 'google', subject: profile.sub },
        });
        return {
            tokens,
            user,
            providerTokens: {
                accessToken: tokenResponse.data.access_token,
                refreshToken: tokenResponse.data.refresh_token,
                expiresIn: tokenResponse.data.expires_in,
                idToken: tokenResponse.data.id_token,
            },
        };
    }
};
exports.OAuthService = OAuthService;
exports.OAuthService = OAuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(user_accounts_interface_1.USER_ACCOUNTS_SERVICE)),
    __param(4, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [config_1.ConfigService, Object, token_service_1.TokenService,
        siem_logger_service_1.SiemLoggerService, Object])
], OAuthService);
//# sourceMappingURL=oauth.service.js.map