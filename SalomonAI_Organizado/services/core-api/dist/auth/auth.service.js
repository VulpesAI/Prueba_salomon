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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = require("bcryptjs");
const user_service_1 = require("../users/user.service");
const token_service_1 = require("./token.service");
const siem_logger_service_1 = require("../security/siem-logger.service");
const totp_util_1 = require("./utils/totp.util");
let AuthService = class AuthService {
    constructor(userService, tokenService, siemLogger) {
        this.userService = userService;
        this.tokenService = tokenService;
        this.siemLogger = siemLogger;
    }
    sanitizeUser(user) {
        if (!user) {
            return null;
        }
        const { passwordHash, mfaSecret, mfaTempSecret, mfaBackupCodes, ...rest } = user;
        return rest;
    }
    async validateUser(email, password, mfaToken) {
        const user = await this.userService.findByEmail(email);
        if (!user || !user.passwordHash) {
            await this.siemLogger.logSecurityEvent({
                type: 'AUTH_LOGIN_FAILED',
                severity: 'high',
                metadata: { email, reason: 'USER_NOT_FOUND' },
            });
            return null;
        }
        const passwordMatches = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatches) {
            await this.siemLogger.logSecurityEvent({
                type: 'AUTH_LOGIN_FAILED',
                severity: 'high',
                userId: user.id,
                metadata: { email, reason: 'INVALID_PASSWORD' },
            });
            return null;
        }
        if (user.mfaEnabled) {
            const normalizedToken = (0, totp_util_1.normalizeMfaToken)(mfaToken);
            if (!normalizedToken) {
                await this.siemLogger.logSecurityEvent({
                    type: 'AUTH_MFA_REQUIRED',
                    severity: 'medium',
                    userId: user.id,
                    metadata: { email },
                });
                throw new common_1.UnauthorizedException({ message: 'Se requiere un token MFA', reason: 'MFA_REQUIRED' });
            }
            let verified = false;
            if (user.mfaSecret) {
                verified = (0, totp_util_1.verifyTotpToken)(normalizedToken, user.mfaSecret);
            }
            if (!verified) {
                verified = await this.userService.consumeBackupCode(user.id, normalizedToken);
                if (!verified) {
                    await this.siemLogger.logSecurityEvent({
                        type: 'AUTH_MFA_FAILED',
                        severity: 'high',
                        userId: user.id,
                        metadata: { email },
                    });
                    throw new common_1.UnauthorizedException({ message: 'Token MFA inválido', reason: 'MFA_INVALID' });
                }
            }
            await this.userService.updateMfaUsage(user.id);
        }
        await this.siemLogger.logSecurityEvent({
            type: 'AUTH_PASSWORD_VALIDATED',
            severity: 'medium',
            userId: user.id,
            metadata: { email },
        });
        return this.sanitizeUser(user);
    }
    async login(user) {
        const tokens = await this.tokenService.issueTokenPair(user);
        await this.siemLogger.logSecurityEvent({
            type: 'AUTH_LOGIN_SUCCESS',
            severity: 'medium',
            userId: user.id,
            metadata: { email: user.email, mfaEnabled: user.mfaEnabled ?? false },
        });
        return {
            ...tokens,
            user,
        };
    }
    async generateJwtToken(payload) {
        const { token } = await this.tokenService.generateAccessToken({
            id: payload.id,
            email: payload.email,
            uid: payload.uid,
            roles: payload.roles,
        });
        return token;
    }
    async register(createUserDto) {
        const existingUser = await this.userService.findByEmail(createUserDto.email);
        if (existingUser) {
            throw new common_1.ConflictException('El email ya está en uso.');
        }
        const user = await this.userService.create(createUserDto);
        await this.siemLogger.logSecurityEvent({
            type: 'AUTH_USER_REGISTERED',
            severity: 'medium',
            userId: user.id,
            metadata: { email: user.email },
        });
        return this.sanitizeUser(user);
    }
    async initiateMfaEnrollment(userId) {
        const user = await this.userService.findOne(userId);
        if (!user) {
            throw new common_1.BadRequestException('Usuario no encontrado');
        }
        const secret = (0, totp_util_1.generateBase32Secret)();
        await this.userService.setMfaTempSecret(user.id, secret);
        const issuer = 'SalomonAI';
        const otpauthUrl = (0, totp_util_1.createOtpAuthUrl)({ label: `${issuer}:${user.email}`, secret, issuer });
        await this.siemLogger.logSecurityEvent({
            type: 'AUTH_MFA_ENROLLMENT_STARTED',
            severity: 'medium',
            userId: user.id,
        });
        return { secret, otpauthUrl };
    }
    async verifyMfaEnrollment(userId, token) {
        const user = await this.userService.getByIdWithSecrets(userId);
        if (!user?.mfaTempSecret) {
            throw new common_1.BadRequestException('No hay un secreto MFA pendiente de verificación.');
        }
        if (!(0, totp_util_1.verifyTotpToken)(token, user.mfaTempSecret)) {
            throw new common_1.UnauthorizedException('Token MFA inválido');
        }
        const backupCodes = (0, totp_util_1.generateBackupCodes)(8);
        const hashedCodes = await Promise.all(backupCodes.map(code => bcrypt.hash(code, 12)));
        await this.userService.activateMfa(user.id, user.mfaTempSecret, hashedCodes);
        await this.siemLogger.logSecurityEvent({
            type: 'AUTH_MFA_ENABLED',
            severity: 'medium',
            userId: user.id,
        });
        return { backupCodes };
    }
    async disableMfa(userId, token, backupCode) {
        const user = await this.userService.getByIdWithSecrets(userId);
        if (!user?.mfaEnabled) {
            return;
        }
        if (!token && !backupCode) {
            throw new common_1.UnauthorizedException('Se requiere un token MFA o código de respaldo para desactivar la protección.');
        }
        const normalizedToken = (0, totp_util_1.normalizeMfaToken)(token);
        const normalizedBackup = (0, totp_util_1.normalizeMfaToken)(backupCode);
        const valid = (user.mfaSecret && normalizedToken ? (0, totp_util_1.verifyTotpToken)(normalizedToken, user.mfaSecret) : false) ||
            (normalizedBackup ? await this.userService.consumeBackupCode(user.id, normalizedBackup) : false);
        if (!valid) {
            throw new common_1.UnauthorizedException('Token MFA inválido');
        }
        await this.userService.disableMfa(user.id);
        await this.siemLogger.logSecurityEvent({
            type: 'AUTH_MFA_DISABLED',
            severity: 'high',
            userId: user.id,
        });
    }
    async refreshTokens(refreshToken) {
        const { tokens, user } = await this.tokenService.rotateRefreshToken(refreshToken);
        const sanitized = this.sanitizeUser(user);
        await this.siemLogger.logSecurityEvent({
            type: 'AUTH_TOKENS_REFRESHED',
            severity: 'medium',
            userId: user.id,
        });
        return { ...tokens, user: sanitized };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [user_service_1.UserService,
        token_service_1.TokenService,
        siem_logger_service_1.SiemLoggerService])
], AuthService);
//# sourceMappingURL=auth.service.js.map