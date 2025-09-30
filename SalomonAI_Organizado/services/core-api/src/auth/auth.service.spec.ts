import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from '../users/user.service';
import { TokenService } from './token.service';
import { SiemLoggerService } from '../security/siem-logger.service';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let authService: AuthService;
  const userService = {
    findByEmail: jest.fn(),
    consumeBackupCode: jest.fn(),
    updateMfaUsage: jest.fn(),
    getByIdWithSecrets: jest.fn(),
  } as unknown as UserService;

  const tokenService = {
    issueTokenPair: jest.fn(),
    revokeTokensForUser: jest.fn(),
    rotateRefreshToken: jest.fn(),
  } as unknown as TokenService;

  const siemLogger = {
    logSecurityEvent: jest.fn().mockResolvedValue(undefined),
  } as unknown as SiemLoggerService;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService(userService, tokenService, siemLogger);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('denies credential validation for inactive users', async () => {
    (userService.findByEmail as jest.Mock).mockResolvedValue({
      id: 'user-id',
      email: 'user@example.com',
      passwordHash: 'hash',
      isActive: false,
    });
    (tokenService.revokeTokensForUser as jest.Mock).mockResolvedValue(undefined);

    await expect(authService.validateUser('user@example.com', 'password')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(tokenService.revokeTokensForUser).toHaveBeenCalledWith('user-id');
    expect(siemLogger.logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'AUTH_LOGIN_BLOCKED',
        metadata: expect.objectContaining({ reason: 'USER_INACTIVE' }),
      }),
    );
  });

  it('rejects login attempts for inactive users', async () => {
    (tokenService.revokeTokensForUser as jest.Mock).mockResolvedValue(undefined);

    await expect(
      authService.login({ id: 'user-id', email: 'user@example.com', roles: ['user'], isActive: false }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(tokenService.issueTokenPair).not.toHaveBeenCalled();
  });

  it('revokes rotated tokens when user is inactive during refresh', async () => {
    (tokenService.rotateRefreshToken as jest.Mock).mockResolvedValue({
      tokens: {
        accessToken: 'access',
        refreshToken: 'refresh',
        tokenType: 'Bearer',
        expiresIn: 900,
        refreshTokenExpiresAt: new Date().toISOString(),
      },
      user: {
        id: 'user-id',
        email: 'user@example.com',
        roles: ['user'],
        isActive: false,
      },
    });
    (tokenService.revokeTokensForUser as jest.Mock).mockResolvedValue(undefined);

    await expect(authService.refreshTokens('refresh-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(tokenService.revokeTokensForUser).toHaveBeenCalledWith('user-id');
  });

  it('allows credential validation for active users', async () => {
    (userService.findByEmail as jest.Mock).mockResolvedValue({
      id: 'user-id',
      email: 'user@example.com',
      passwordHash: 'hash',
      isActive: true,
      mfaEnabled: false,
      roles: ['user'],
    });
    jest.spyOn(bcrypt, 'compare').mockImplementation(async () => true);

    const user = await authService.validateUser('user@example.com', 'password');

    expect(user).toMatchObject({ id: 'user-id', email: 'user@example.com', isActive: true });
    expect(tokenService.revokeTokensForUser).not.toHaveBeenCalled();
  });
});
