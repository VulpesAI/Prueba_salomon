import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UserService } from '../users/user.service';
import { TokenService, TokenPair } from './token.service';
import { SiemLoggerService } from '../security/siem-logger.service';
import {
  createOtpAuthUrl,
  generateBackupCodes,
  generateBase32Secret,
  normalizeMfaToken,
  verifyTotpToken,
} from './utils/totp.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    private readonly siemLogger: SiemLoggerService,
  ) {}

  private sanitizeUser(user: any) {
    if (!user) {
      return null;
    }
    const { passwordHash, mfaSecret, mfaTempSecret, mfaBackupCodes, ...rest } = user;
    return rest;
  }

  async validateUser(email: string, password: string, mfaToken?: string): Promise<any> {
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
      const normalizedToken = normalizeMfaToken(mfaToken);
      if (!normalizedToken) {
        await this.siemLogger.logSecurityEvent({
          type: 'AUTH_MFA_REQUIRED',
          severity: 'medium',
          userId: user.id,
          metadata: { email },
        });
        throw new UnauthorizedException({ message: 'Se requiere un token MFA', reason: 'MFA_REQUIRED' });
      }

      let verified = false;
      if (user.mfaSecret) {
        verified = verifyTotpToken(normalizedToken, user.mfaSecret);
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
          throw new UnauthorizedException({ message: 'Token MFA inválido', reason: 'MFA_INVALID' });
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

  async login(user: { id: string; email: string; roles?: string[]; mfaEnabled?: boolean }) {
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

  async generateJwtToken(payload: { id: string; email: string; uid?: string; roles?: string[] }): Promise<string> {
    const { token } = await this.tokenService.generateAccessToken({
      id: payload.id,
      email: payload.email,
      uid: payload.uid,
      roles: payload.roles,
    });
    return token;
  }

  async register(createUserDto: CreateUserDto) {
    const existingUser = await this.userService.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('El email ya está en uso.');
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

  async initiateMfaEnrollment(userId: string): Promise<{ secret: string; otpauthUrl: string }> {
    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    const secret = generateBase32Secret();
    await this.userService.setMfaTempSecret(user.id, secret);

    const issuer = 'SalomonAI';
    const otpauthUrl = createOtpAuthUrl({ label: `${issuer}:${user.email}`, secret, issuer });

    await this.siemLogger.logSecurityEvent({
      type: 'AUTH_MFA_ENROLLMENT_STARTED',
      severity: 'medium',
      userId: user.id,
    });

    return { secret, otpauthUrl };
  }

  async verifyMfaEnrollment(userId: string, token: string): Promise<{ backupCodes: string[] }> {
    const user = await this.userService.getByIdWithSecrets(userId);
    if (!user?.mfaTempSecret) {
      throw new BadRequestException('No hay un secreto MFA pendiente de verificación.');
    }

    if (!verifyTotpToken(token, user.mfaTempSecret)) {
      throw new UnauthorizedException('Token MFA inválido');
    }

    const backupCodes = generateBackupCodes(8);
    const hashedCodes = await Promise.all(backupCodes.map(code => bcrypt.hash(code, 12)));

    await this.userService.activateMfa(user.id, user.mfaTempSecret, hashedCodes);

    await this.siemLogger.logSecurityEvent({
      type: 'AUTH_MFA_ENABLED',
      severity: 'medium',
      userId: user.id,
    });

    return { backupCodes };
  }

  async disableMfa(userId: string, token?: string, backupCode?: string): Promise<void> {
    const user = await this.userService.getByIdWithSecrets(userId);
    if (!user?.mfaEnabled) {
      return;
    }

    if (!token && !backupCode) {
      throw new UnauthorizedException('Se requiere un token MFA o código de respaldo para desactivar la protección.');
    }

    const normalizedToken = normalizeMfaToken(token);
    const normalizedBackup = normalizeMfaToken(backupCode);
    const valid =
      (user.mfaSecret && normalizedToken ? verifyTotpToken(normalizedToken, user.mfaSecret) : false) ||
      (normalizedBackup ? await this.userService.consumeBackupCode(user.id, normalizedBackup) : false);

    if (!valid) {
      throw new UnauthorizedException('Token MFA inválido');
    }

    await this.userService.disableMfa(user.id);

    await this.siemLogger.logSecurityEvent({
      type: 'AUTH_MFA_DISABLED',
      severity: 'high',
      userId: user.id,
    });
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair & { user: any }> {
    const { tokens, user } = await this.tokenService.rotateRefreshToken(refreshToken);
    const sanitized = this.sanitizeUser(user);

    await this.siemLogger.logSecurityEvent({
      type: 'AUTH_TOKENS_REFRESHED',
      severity: 'medium',
      userId: user.id,
    });

    return { ...tokens, user: sanitized };
  }
}

