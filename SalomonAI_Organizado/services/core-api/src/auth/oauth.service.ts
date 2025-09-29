import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { randomBytes, randomUUID, createHash } from 'crypto';
import { UserService } from '../users/user.service';
import { TokenService } from './token.service';
import { SiemLoggerService } from '../security/siem-logger.service';
import { GoogleOAuthCallbackDto } from './dto/google-oauth.dto';

const GOOGLE_AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo';

const base64UrlEncode = (buffer: Buffer) =>
  buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

@Injectable()
export class OAuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    private readonly siemLogger: SiemLoggerService,
  ) {}

  private getGoogleClientId(): string {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) {
      throw new InternalServerErrorException('GOOGLE_CLIENT_ID no está configurado.');
    }
    return clientId;
  }

  private getGoogleClientSecret(): string {
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    if (!clientSecret) {
      throw new InternalServerErrorException('GOOGLE_CLIENT_SECRET no está configurado.');
    }
    return clientSecret;
  }

  private resolveRedirectUri(override?: string): string {
    return override ?? this.configService.get<string>('GOOGLE_OAUTH_REDIRECT_URI', 'http://localhost:3000/auth/google/callback');
  }

  generateGoogleAuthorizationUrl(redirectUri?: string) {
    const verifier = base64UrlEncode(randomBytes(32));
    const challenge = base64UrlEncode(createHash('sha256').update(verifier).digest());
    const state = randomUUID();

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

  async handleGoogleCallback(dto: GoogleOAuthCallbackDto) {
    const redirectUri = this.resolveRedirectUri(dto.redirectUri);

    let tokenResponse;
    try {
      tokenResponse = await axios.post(
        GOOGLE_TOKEN_ENDPOINT,
        new URLSearchParams({
          client_id: this.getGoogleClientId(),
          client_secret: this.getGoogleClientSecret(),
          code: dto.code,
          code_verifier: dto.codeVerifier,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
    } catch (error) {
      throw new InternalServerErrorException('No fue posible intercambiar el código de autorización con Google.');
    }

    if (!tokenResponse.data?.access_token) {
      throw new InternalServerErrorException('No se recibió access_token desde Google.');
    }

    let userInfoResponse;
    try {
      userInfoResponse = await axios.get(GOOGLE_USERINFO_ENDPOINT, {
        headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` },
      });
    } catch (error) {
      throw new InternalServerErrorException('No fue posible obtener el perfil de usuario desde Google.');
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
}

