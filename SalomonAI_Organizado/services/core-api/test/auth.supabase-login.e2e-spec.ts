import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { AuthUser } from '@supabase/supabase-js';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { setupGlobalPrefix } from '../src/config/app.config';
import { SupabaseService } from '../src/auth/supabase.service';

describe('AuthController - /auth/supabase-login (e2e)', () => {
  let app: INestApplication;
  let supabaseServiceMock: jest.Mocked<SupabaseService>;

  beforeAll(async () => {
    supabaseServiceMock = {
      isEnabled: jest.fn(),
      getUser: jest.fn(),
    } as unknown as jest.Mocked<SupabaseService>;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SupabaseService)
      .useValue(supabaseServiceMock)
      .compile();

    app = moduleRef.createNestApplication();
    const configService = app.get(ConfigService);
    setupGlobalPrefix(app, configService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    supabaseServiceMock.isEnabled.mockClear();
    supabaseServiceMock.isEnabled.mockReturnValue(true);
    supabaseServiceMock.getUser.mockReset();
  });

  it('returns an access token and user information for a valid Supabase access token', async () => {
    const supabaseUser: AuthUser = {
      id: 'supabase-user-123',
      email: 'user@example.com',
      aud: 'authenticated',
      user_metadata: {
        full_name: 'Test User',
        avatar_url: 'https://example.com/avatar.png',
      },
      app_metadata: { provider: 'email' },
      created_at: '2023-01-01T00:00:00.000Z',
    };

    supabaseServiceMock.getUser.mockResolvedValue(supabaseUser);

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/supabase-login')
      .send({ access_token: 'valid-supabase-token' })
      .expect(201);

    expect(response.body).toMatchObject({
      token: expect.any(String),
      user: {
        id: 'supabase-user-123',
        email: 'user@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.png',
      },
    });

    expect(supabaseServiceMock.getUser).toHaveBeenCalledWith('valid-supabase-token');
  });

  it('returns 503 when Supabase authentication is disabled', async () => {
    supabaseServiceMock.isEnabled.mockReturnValue(false);

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/supabase-login')
      .send({ access_token: 'any-token' })
      .expect(503);

    expect(response.body).toMatchObject({
      statusCode: 503,
      message: 'Supabase authentication is disabled',
    });
    expect(supabaseServiceMock.getUser).not.toHaveBeenCalled();
  });

  it('returns 400 when no Supabase access token is provided', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/supabase-login')
      .send({})
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      message: 'A valid Supabase access token is required',
    });
    expect(supabaseServiceMock.getUser).not.toHaveBeenCalled();
  });

  it('returns 401 when Supabase rejects the token', async () => {
    supabaseServiceMock.getUser.mockResolvedValue(null);

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/supabase-login')
      .send({ access_token: 'invalid-supabase-token' })
      .expect(401);

    expect(response.body).toMatchObject({
      statusCode: 401,
      message: 'Invalid Supabase access token',
    });
  });
});
