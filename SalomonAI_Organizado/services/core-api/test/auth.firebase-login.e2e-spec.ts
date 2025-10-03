import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { setupGlobalPrefix } from '../src/config/app.config';
import { FirebaseAdminService } from '../src/auth/firebase-admin.service';

describe('AuthController - /auth/firebase-login (e2e)', () => {
  let app: INestApplication;
  let firebaseAdminServiceMock: jest.Mocked<FirebaseAdminService>;
  const originalEnv = process.env;

  beforeAll(async () => {
    process.env = {
      ...originalEnv,
      JWT_SECRET: originalEnv.JWT_SECRET ?? 'test-secret',
      ENABLE_FIREBASE: 'true',
    } as NodeJS.ProcessEnv;

    firebaseAdminServiceMock = {
      isEnabled: jest.fn(),
      verifyIdToken: jest.fn()
    } as unknown as jest.Mocked<FirebaseAdminService>;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    })
      .overrideProvider(FirebaseAdminService)
      .useValue(firebaseAdminServiceMock)
      .compile();

    app = moduleRef.createNestApplication();
    const configService = app.get(ConfigService);
    setupGlobalPrefix(app, configService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    process.env = originalEnv;
  });

  beforeEach(() => {
    firebaseAdminServiceMock.isEnabled.mockClear();
    firebaseAdminServiceMock.isEnabled.mockReturnValue(true);
    firebaseAdminServiceMock.verifyIdToken.mockReset();
  });

  it('returns an access token and user information for a valid Firebase token', async () => {
    firebaseAdminServiceMock.verifyIdToken.mockResolvedValue({
      uid: 'firebase-user-123',
      email: 'user@example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.png',
      firebase: { sign_in_provider: 'password' }
    } as any);

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/firebase-login')
      .send({ token: 'valid-firebase-token' })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        token: expect.any(String),
        user: {
          uid: 'firebase-user-123',
          email: 'user@example.com',
          name: 'Test User',
          picture: 'https://example.com/avatar.png'
        }
      })
    );

    expect(firebaseAdminServiceMock.verifyIdToken).toHaveBeenCalledWith('valid-firebase-token');
  });

  it('returns 503 when Firebase authentication is disabled', async () => {
    firebaseAdminServiceMock.isEnabled.mockReturnValue(false);

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/firebase-login')
      .send({ token: 'any-token' })
      .expect(503);

    expect(response.body).toMatchObject({
      statusCode: 503,
      message: 'Firebase authentication is disabled'
    });
    expect(firebaseAdminServiceMock.verifyIdToken).not.toHaveBeenCalled();
  });

  it('returns 401 when Firebase rejects the token', async () => {
    firebaseAdminServiceMock.verifyIdToken.mockRejectedValue(new Error('invalid token'));

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/firebase-login')
      .send({ token: 'invalid-firebase-token' })
      .expect(401);

    expect(response.body).toMatchObject({
      statusCode: 401,
      message: 'Invalid Firebase token'
    });
  });
});
