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

  it('GET /health should return ok', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ ok: true });
  });

  it('GET /api/v1/health should remain available', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect({ ok: true });
  });
});
