import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transport, type KafkaOptions } from '@nestjs/microservices';

import { AppModule } from './app.module';
import { setupGlobalPrefix } from './config/app.config';
import { loadRootEnv } from './config/env.loader';
import { injectSecretsIntoEnv } from './config/secrets.loader';
import { HealthService } from './health/health.service';
import type { ResultsMessagingConfig } from './config/configuration';

loadRootEnv();
injectSecretsIntoEnv();

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  setupGlobalPrefix(app, configService);

  const allowedOrigins = configService.get<string[]>('app.allowedOrigins', { infer: true }) ?? [];

  const resultsConfig = configService.get<ResultsMessagingConfig>('messaging.results', {
    infer: true,
  });

  let resultsMicroserviceRegistered = false;

  if (resultsConfig?.enabled && resultsConfig.brokers.length > 0) {
    const kafkaOptions: KafkaOptions = {
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: `core-api-results-${Math.random().toString(36).slice(2, 10)}`,
          brokers: resultsConfig.brokers,
        },
        consumer: {
          groupId: resultsConfig.groupId,
        },
        subscribe: {
          topics: [resultsConfig.topic],
          fromBeginning: false,
        },
      },
    };

    app.connectMicroservice(kafkaOptions);
    resultsMicroserviceRegistered = true;
    logger.log(`Kafka consumer connected to topic ${resultsConfig.topic}`);
  } else {
    logger.log('Kafka consumer for parsed statements is disabled (no brokers configured).');
  }

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

  if (resultsMicroserviceRegistered) {
    await app.startAllMicroservices();
  }

  const port = configService.get<number>('app.port', { infer: true }) ?? 8080;
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
