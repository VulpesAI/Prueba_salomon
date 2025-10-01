import { CacheModule } from '@nestjs/cache-manager';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { OAuthService } from './oauth.service';
import { TokenService } from './token.service';
import { SiemLoggerService } from '../security/siem-logger.service';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import {
  USER_ACCOUNTS_SERVICE,
  UserAccountsService,
} from '../users/interfaces/user-accounts.interface';

describe('OAuthService', () => {
  let service: OAuthService;
  let cache: Cache;
  let moduleRef: TestingModule;

  const configService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const map: Record<string, string> = {
        GOOGLE_CLIENT_ID: 'client-id',
        GOOGLE_CLIENT_SECRET: 'client-secret',
        GOOGLE_OAUTH_REDIRECT_URI: 'http://localhost/callback',
      };

      return map[key] ?? defaultValue;
    }),
  } as unknown as ConfigService;

  const userService = {
    upsertOAuthUser: jest.fn(),
  } as unknown as UserAccountsService;

  const tokenService = {
    issueTokenPair: jest.fn(),
    revokeTokensForUser: jest.fn(),
  } as unknown as TokenService;

  const siemLogger = {
    logSecurityEvent: jest.fn().mockResolvedValue(undefined),
  } as unknown as SiemLoggerService;

  beforeEach(async () => {
    jest.clearAllMocks();

    moduleRef = await Test.createTestingModule({
      imports: [CacheModule.register()],
      providers: [
        OAuthService,
        { provide: ConfigService, useValue: configService },
        { provide: USER_ACCOUNTS_SERVICE, useValue: userService },
        { provide: TokenService, useValue: tokenService },
        { provide: SiemLoggerService, useValue: siemLogger },
      ],
    }).compile();

    service = moduleRef.get(OAuthService);
    cache = moduleRef.get(CACHE_MANAGER);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await cache.reset?.();
    await moduleRef.close();
  });

  it('stores state and codeVerifier when generating the authorization URL', async () => {
    const result = await service.generateGoogleAuthorizationUrl();
    const cached = await cache.get<{ codeVerifier: string }>(`oauth:google:${result.state}`);

    expect(result.authorizationUrl).toContain(`state=${result.state}`);
    expect(result.codeVerifier).toEqual(cached?.codeVerifier);
  });

  it('completes the callback when state is valid', async () => {
    const stateData = await service.generateGoogleAuthorizationUrl();

    jest.spyOn(axios, 'post').mockResolvedValue({
      data: {
        access_token: 'access',
        refresh_token: 'refresh',
        expires_in: 3600,
        id_token: 'id-token',
      },
    });

    jest.spyOn(axios, 'get').mockResolvedValue({
      data: {
        email: 'user@example.com',
        name: 'User Example',
        given_name: 'User',
        picture: 'http://example.com/avatar.png',
        sub: 'google-sub',
      },
    });

    (userService.upsertOAuthUser as jest.Mock).mockResolvedValue({
      id: 'user-id',
      email: 'user@example.com',
      fullName: 'User Example',
      roles: ['user'],
      uid: 'uid-123',
    });

    (tokenService.issueTokenPair as jest.Mock).mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    const response = await service.handleGoogleCallback({
      code: 'auth-code',
      codeVerifier: stateData.codeVerifier,
      redirectUri: 'http://localhost/override',
      state: stateData.state,
    });

    expect(response.user).toEqual(
      expect.objectContaining({ id: 'user-id', email: 'user@example.com' }),
    );
    expect(await cache.get(`oauth:google:${stateData.state}`)).toBeUndefined();
    expect(tokenService.revokeTokensForUser).not.toHaveBeenCalled();
  });

  it('rejects the callback when the state is missing or invalid', async () => {
    await expect(
      service.handleGoogleCallback({
        code: 'auth-code',
        codeVerifier: 'verifier',
        redirectUri: 'http://localhost/override',
        state: undefined as unknown as string,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.handleGoogleCallback({
        code: 'auth-code',
        codeVerifier: 'verifier',
        redirectUri: 'http://localhost/override',
        state: 'unknown-state',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects the callback when the user is inactive', async () => {
    const stateData = await service.generateGoogleAuthorizationUrl();

    jest.spyOn(axios, 'post').mockResolvedValue({
      data: {
        access_token: 'access',
        refresh_token: 'refresh',
        expires_in: 3600,
        id_token: 'id-token',
      },
    });

    jest.spyOn(axios, 'get').mockResolvedValue({
      data: {
        email: 'user@example.com',
        name: 'User Example',
        given_name: 'User',
        picture: 'http://example.com/avatar.png',
        sub: 'google-sub',
      },
    });

    (userService.upsertOAuthUser as jest.Mock).mockResolvedValue({
      id: 'user-id',
      email: 'user@example.com',
      fullName: 'User Example',
      roles: ['user'],
      uid: 'uid-123',
      isActive: false,
    });

    (tokenService.revokeTokensForUser as jest.Mock).mockResolvedValue(undefined);

    await expect(
      service.handleGoogleCallback({
        code: 'auth-code',
        codeVerifier: stateData.codeVerifier,
        redirectUri: 'http://localhost/override',
        state: stateData.state,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(tokenService.issueTokenPair).not.toHaveBeenCalled();
    expect(tokenService.revokeTokensForUser).toHaveBeenCalledWith('user-id');
    expect(await cache.get(`oauth:google:${stateData.state}`)).toBeUndefined();
  });
});
