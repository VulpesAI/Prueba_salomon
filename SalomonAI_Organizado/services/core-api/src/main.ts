import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { setupGlobalPipes, setupGlobalPrefix, setupSwagger, setupCors } from './config/app.config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { loadTlsOptionsFromEnv } from './security/tls.util';

async function bootstrap() {
  const httpsOptions = await loadTlsOptionsFromEnv();
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    ...(httpsOptions ? { httpsOptions } : {}),
  });
  
  const configService = app.get(ConfigService);
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);

  if (httpsOptions) {
    logger.log('🔐 TLS 1.3 habilitado con certificados gestionados vía KMS.');
  } else {
    logger.warn('TLS no habilitado. Se ejecutará sobre HTTP hasta que se configuren certificados.');
  }

  // Configuración de seguridad y rendimiento
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
  
  app.use(compression());

  // Configuración global
  setupGlobalPipes(app);
  setupGlobalPrefix(app, configService);
  setupCors(app, configService);
  
  // Swagger solo en desarrollo y staging
  const nodeEnv = configService.get('NODE_ENV', 'development');
  if (nodeEnv !== 'production') {
    setupSwagger(app);
  }

  // Configuración de timeout para requests largos
  app.use((req, res, next) => {
    req.setTimeout(300000); // 5 minutos
    next();
  });

  const port = Number(process.env.PORT ?? 8080);
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    logger.log('Received SIGINT, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.log('Received SIGTERM, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  console.log(`[BOOT] PORT=${process.env.PORT || 8080}`);
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 SalomónAI API ejecutándose en: http://0.0.0.0:${port}`);
  logger.log(`📖 Documentación Swagger: http://0.0.0.0:${port}/api/docs`);
  logger.log(`🏥 Health Check: http://0.0.0.0:${port}/api/v1/health`);
  logger.log(`🌍 Environment: ${nodeEnv}`);
}

bootstrap().catch(err => {
  const logger = new Logger('Bootstrap');
  logger.error('Failed to start application', err);
  process.exit(1);
});
