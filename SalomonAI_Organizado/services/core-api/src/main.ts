import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module';
import { setupGlobalPrefix } from './config/app.config';
import { HealthService } from './health/health.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  setupGlobalPrefix(app, configService);

  const allowedOrigins = configService.get<string[]>('app.allowedOrigins', { infer: true }) ?? [];

  const healthService = app.get(HealthService);
  const httpAdapter = app.getHttpAdapter();
  const httpServer = httpAdapter.getInstance();

  type HealthResponse = { json: (body: unknown) => void };

  if (typeof httpServer.get === 'function') {
    httpServer.get('/health', (_req: unknown, res: HealthResponse) => {
      const healthStatus = healthService.getHealthStatus();

      res.json({
        ok: true,
        ...healthStatus,
      });
    });
  }

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = configService.get<number>('app.port', { infer: true }) ?? 8080;
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
