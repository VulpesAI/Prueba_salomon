import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes, randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
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

interface JwtPayload {
  sub: string;
  email: string;
  roles?: string[];
  uid?: string;
}

@Injectable()
export class TokenService {
  constructor(
    @InjectRepository(AuthToken)
    private readonly authTokenRepository: Repository<AuthToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly siemLogger: SiemLoggerService,
  ) {}

  private getAccessTokenTtlSeconds(): number {
    const value = this.configService.get<string>('JWT_ACCESS_TOKEN_TTL_SECONDS') ?? '900';
    const ttl = Number(value);
    return Number.isNaN(ttl) ? 900 : ttl;
  }

  private getRefreshTokenTtlSeconds(): number {
    const value = this.configService.get<string>('JWT_REFRESH_TOKEN_TTL_SECONDS') ?? (60 * 60 * 24 * 30).toString();
    const ttl = Number(value);
    return Number.isNaN(ttl) ? 60 * 60 * 24 * 30 : ttl;
  }

  private async createRefreshTokenRecord(user: { id: string }): Promise<{ token: string; expiresAt: Date }> {
    const tokenSecret = randomBytes(48).toString('hex');
    const refreshTokenHash = await bcrypt.hash(tokenSecret, 12);
    const expiresAt = new Date(Date.now() + this.getRefreshTokenTtlSeconds() * 1000);

    const entity = this.authTokenRepository.create({
      user: { id: user.id } as User,
      refreshTokenHash,
      expiresAt,
    });
    const saved = await this.authTokenRepository.save(entity);
    const refreshToken = `${saved.id}.${tokenSecret}`;

    return { token: refreshToken, expiresAt };
  }

  private async verifyRefreshToken(rawToken: string): Promise<AuthToken & { user: User }> {
    const [tokenId, tokenSecret] = rawToken.split('.');
    if (!tokenId || !tokenSecret) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const token = await this.authTokenRepository
      .createQueryBuilder('token')
      .leftJoinAndSelect('token.user', 'user')
      .addSelect('token.refreshTokenHash')
      .where('token.id = :id', { id: tokenId })
      .getOne();

    if (!token) {
      throw new UnauthorizedException('Refresh token no encontrado');
    }

    if (token.revokedAt) {
      throw new UnauthorizedException('Refresh token revocado');
    }

    if (token.rotatedAt) {
      throw new UnauthorizedException('Refresh token ya fue rotado');
    }

    if (token.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token expirado');
    }

    const isValid = await bcrypt.compare(tokenSecret, token.refreshTokenHash);
    if (!isValid) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    return token as AuthToken & { user: User };
  }

  private buildJwtPayload(user: { id: string; email: string; roles?: string[]; uid?: string }): JwtPayload {
    return {
      sub: user.id,
      email: user.email,
      roles: user.roles ?? ['user'],
      uid: user.uid,
    };
  }

  async generateAccessToken(user: { id: string; email: string; roles?: string[]; uid?: string }): Promise<{
    token: string;
    expiresInSeconds: number;
  }> {
    const payload = this.buildJwtPayload(user);
    const expiresInSeconds = this.getAccessTokenTtlSeconds();
    const token = this.jwtService.sign(payload, {
      expiresIn: expiresInSeconds,
      jwtid: randomUUID(),
    });
    return { token, expiresInSeconds };
  }

  async issueTokenPair(user: { id: string; email: string; roles?: string[]; uid?: string }): Promise<TokenPair> {
    const [{ token: refreshToken, expiresAt }, { token: accessToken, expiresInSeconds }] = await Promise.all([
      this.createRefreshTokenRecord(user),
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

  async rotateRefreshToken(rawToken: string): Promise<{ user: User; tokens: TokenPair }> {
    const token = await this.verifyRefreshToken(rawToken);

    token.rotatedAt = new Date();
    await this.authTokenRepository.save(token);

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

  async revokeTokensForUser(userId: string): Promise<void> {
    await this.authTokenRepository.update({ user: { id: userId } as User }, { revokedAt: new Date() });

    await this.siemLogger.logSecurityEvent({
      type: 'AUTH_TOKENS_REVOKED',
      severity: 'high',
      userId,
    });
  }
}

