import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { setupGlobalPrefix } from '../src/config/app.config';

jest.setTimeout(30000);

describe('HealthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    const configService = app.get(ConfigService);
    setupGlobalPrefix(app, configService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health should expose the service status snapshot', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);

    expect(response.body).toMatchObject({
      ok: true,
      status: 'ok',
    });
    expect(response.body).toHaveProperty('environment');
    expect(response.body).toHaveProperty('profile');
    expect(response.body).toHaveProperty('version');
    expect(typeof response.body.timestamp).toBe('string');
  });
});
