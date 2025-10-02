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
exports.TokenService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const bcrypt = require("bcryptjs");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const siem_logger_service_1 = require("../security/siem-logger.service");
const token_store_interface_1 = require("./token-store/token-store.interface");
let TokenService = class TokenService {
    constructor(tokenStore, jwtService, configService, siemLogger) {
        this.tokenStore = tokenStore;
        this.jwtService = jwtService;
        this.configService = configService;
        this.siemLogger = siemLogger;
    }
    getAccessTokenTtlSeconds() {
        const value = this.configService.get('JWT_ACCESS_TOKEN_TTL_SECONDS') ?? '900';
        const ttl = Number(value);
        return Number.isNaN(ttl) ? 900 : ttl;
    }
    getRefreshTokenTtlSeconds() {
        const value = this.configService.get('JWT_REFRESH_TOKEN_TTL_SECONDS') ?? (60 * 60 * 24 * 30).toString();
        const ttl = Number(value);
        return Number.isNaN(ttl) ? 60 * 60 * 24 * 30 : ttl;
    }
    toTokenUser(user) {
        return {
            id: user.id,
            email: user.email,
            roles: user.roles,
            uid: user.uid,
        };
    }
    async createRefreshTokenRecord(user) {
        const tokenSecret = (0, crypto_1.randomBytes)(48).toString('hex');
        const refreshTokenHash = await bcrypt.hash(tokenSecret, 12);
        const expiresAt = new Date(Date.now() + this.getRefreshTokenTtlSeconds() * 1000);
        const { id } = await this.tokenStore.createRefreshToken(user, refreshTokenHash, expiresAt);
        const refreshToken = `${id}.${tokenSecret}`;
        return { token: refreshToken, expiresAt };
    }
    async verifyRefreshToken(rawToken) {
        const [tokenId, tokenSecret] = rawToken.split('.');
        if (!tokenId || !tokenSecret) {
            throw new common_1.UnauthorizedException('Refresh token inválido');
        }
        const token = await this.tokenStore.findRefreshTokenById(tokenId);
        if (!token) {
            throw new common_1.UnauthorizedException('Refresh token no encontrado');
        }
        if (token.revokedAt) {
            throw new common_1.UnauthorizedException('Refresh token revocado');
        }
        if (token.rotatedAt) {
            throw new common_1.UnauthorizedException('Refresh token ya fue rotado');
        }
        if (token.expiresAt.getTime() < Date.now()) {
            throw new common_1.UnauthorizedException('Refresh token expirado');
        }
        const isValid = await bcrypt.compare(tokenSecret, token.refreshTokenHash);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Refresh token inválido');
        }
        return token;
    }
    buildJwtPayload(user) {
        return {
            sub: user.id,
            email: user.email,
            roles: user.roles ?? ['user'],
            uid: user.uid,
        };
    }
    async generateAccessToken(user) {
        const payload = this.buildJwtPayload(user);
        const expiresInSeconds = this.getAccessTokenTtlSeconds();
        const token = this.jwtService.sign(payload, {
            expiresIn: expiresInSeconds,
            jwtid: (0, crypto_1.randomUUID)(),
        });
        return { token, expiresInSeconds };
    }
    async issueTokenPair(user) {
        const tokenUser = this.toTokenUser(user);
        const [{ token: refreshToken, expiresAt }, { token: accessToken, expiresInSeconds }] = await Promise.all([
            this.createRefreshTokenRecord(tokenUser),
            this.generateAccessToken(user),
        ]);
        await this.siemLogger.logSecurityEvent({
            type: 'AUTH_TOKENS_ISSUED',
            severity: 'medium',
            userId: user.id,
            metadata: { expiresInSeconds, refreshTokenExpiresAt: expiresAt.toISOString() },
        });
        return {
            accessToken,
            refreshToken,
            tokenType: 'Bearer',
            expiresIn: expiresInSeconds,
            refreshTokenExpiresAt: expiresAt.toISOString(),
        };
    }
    async rotateRefreshToken(rawToken) {
        const token = await this.verifyRefreshToken(rawToken);
        const rotatedAt = new Date();
        await this.tokenStore.markRotated(token.id, rotatedAt);
        const tokens = await this.issueTokenPair({
            id: token.user.id,
            email: token.user.email,
            roles: token.user.roles,
            uid: token.user.uid,
        });
        await this.siemLogger.logSecurityEvent({
            type: 'AUTH_REFRESH_ROTATED',
            severity: 'medium',
            userId: token.user.id,
            metadata: { previousTokenId: token.id },
        });
        return { user: token.user, tokens };
    }
    async revokeTokensForUser(userId) {
        await this.tokenStore.revokeTokensForUser(userId);
        await this.siemLogger.logSecurityEvent({
            type: 'AUTH_TOKENS_REVOKED',
            severity: 'high',
            userId,
        });
    }
};
exports.TokenService = TokenService;
exports.TokenService = TokenService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(token_store_interface_1.TOKEN_STORE)),
    __metadata("design:paramtypes", [Object, jwt_1.JwtService,
        config_1.ConfigService,
        siem_logger_service_1.SiemLoggerService])
], TokenService);
//# sourceMappingURL=token.service.js.map