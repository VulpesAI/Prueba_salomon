import { ConfigService } from '@nestjs/config';
import { INestApplication, ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const createDatabaseConfig = (configService: ConfigService) => ({
  type: 'postgres' as const,
  host: configService.get<string>('POSTGRES_HOST', 'postgres'),
  port: configService.get<number>('POSTGRES_PORT', 5432),
  username: configService.get<string>('POSTGRES_USER', 'salomon_user'),
  password: configService.get<string>('POSTGRES_PASSWORD'),
  database: configService.get<string>('POSTGRES_DB', 'salomon_db'),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: configService.get<string>('NODE_ENV') !== 'production',
  logging: configService.get<string>('NODE_ENV') !== 'production',
  ssl: false, // Disable SSL for Docker development and production
  extra: {
    max: 20, // Pool de conexiones máximo
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
  },
});

export const createQdrantConfig = (configService: ConfigService) => ({
  url: configService.get<string>('QDRANT_URL', 'http://qdrant:6333'),
  host: configService.get<string>('QDRANT_HOST', 'qdrant'),
  port: configService.get<number>('QDRANT_PORT', 6333),
  collectionName: configService.get<string>('QDRANT_COLLECTION_NAME', 'financial_transactions'),
});

export const createCacheConfig = (configService: ConfigService) => ({
  ttl: configService.get<number>('CACHE_TTL', 3600) * 1000, // Convert to milliseconds
  max: 100,
  store: 'memory',
});

export const createThrottlerConfig = (configService: ConfigService) => [
  {
    name: 'short',
    ttl: 1000,
    limit: 10,
  },
  {
    name: 'medium', 
    ttl: 60000,
    limit: 100,
  },
  {
    name: 'long',
    ttl: 3600000,
    limit: 1000,
  },
];

export const createJwtConfig = (configService: ConfigService) => ({
  secret: configService.get<string>('JWT_SECRET'),
  signOptions: {
    expiresIn: configService.get<string>('JWT_EXPIRES_IN', '24h'),
  },
});

// Configuraciones para la aplicación
export const setupGlobalPipes = (app: INestApplication) => {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
};

export const setupGlobalPrefix = (app: INestApplication, configService: ConfigService) => {
  app.setGlobalPrefix('api/v1');
};

export const setupCors = (app: INestApplication, configService: ConfigService) => {
  const corsOrigins = configService.get<string>('CORS_ORIGIN', 'http://localhost:3001');
  app.enableCors({
    origin: corsOrigins.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });
};

export const setupSwagger = (app: INestApplication) => {
  const config = new DocumentBuilder()
    .setTitle('SalomónAI API')
    .setDescription('API inteligente para gestión financiera personal')
    .setVersion('3.0')
    .addBearerAuth()
    .addTag('Auth', 'Autenticación y autorización')
    .addTag('Transactions', 'Gestión de transacciones')
    .addTag('Classification', 'Clasificación inteligente de transacciones')
    .addTag('NLP', 'Procesamiento de lenguaje natural')
    .addTag('Goals', 'Gestión de metas financieras y seguimiento de progreso')
    .addTag('Health', 'Health checks y monitoreo')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });
};