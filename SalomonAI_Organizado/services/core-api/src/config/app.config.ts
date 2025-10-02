import { ConfigService } from '@nestjs/config';
import { INestApplication, ValidationPipe, Logger, RequestMethod } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const createDatabaseConfig = (configService: ConfigService) => {
  const databaseUrl =
    configService.get<string>('POSTGRES_URL') ?? configService.get<string>('DATABASE_URL');

  let parsedHost: string | undefined;
  let parsedPort: string | undefined;
  let parsedUsername: string | undefined;
  let parsedPassword: string | undefined;
  let parsedDatabase: string | undefined;

  if (databaseUrl) {
    try {
      const url = new URL(databaseUrl);
      parsedHost = url.hostname;
      parsedPort = url.port;
      parsedUsername = url.username || undefined;
      parsedPassword = url.password || undefined;
      parsedDatabase = url.pathname?.replace(/^\//, '') || undefined;
    } catch (error) {
      Logger.warn(`Invalid POSTGRES_URL provided: ${error}`);
    }
  }

  const host =
    configService.get<string>('POSTGRES_HOST') ??
    configService.get<string>('DATABASE_HOST') ??
    parsedHost ??
    'db.supabase.co';
  const portValue =
    (configService.get<string | number>('POSTGRES_PORT') ??
      configService.get<string | number>('DATABASE_PORT') ??
      parsedPort ??
      '5432') as string | number;
  const username =
    configService.get<string>('POSTGRES_USER') ??
    configService.get<string>('DATABASE_USER') ??
    parsedUsername ??
    'postgres';
  const password =
    configService.get<string>('POSTGRES_PASSWORD') ??
    configService.get<string>('DATABASE_PASSWORD') ??
    parsedPassword ??
    undefined;
  const database =
    configService.get<string>('POSTGRES_DB') ??
    configService.get<string>('DATABASE_NAME') ??
    parsedDatabase ??
    'postgres';

  const portNormalized =
    typeof portValue === 'number' ? portValue : parseInt(portValue, 10);

  return {
    type: 'postgres' as const,
    host,
    port: Number.isNaN(portNormalized) ? 5432 : portNormalized,
    username,
    password,
    database,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    synchronize: configService.get<string>('NODE_ENV') !== 'production',
    logging: configService.get<string>('NODE_ENV') !== 'production',
    ssl: { rejectUnauthorized: false },
    extra: {
      max: 20, // Pool de conexiones máximo
      connectionTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
    },
  };
};

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
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'health', method: RequestMethod.ALL },
      { path: 'health/(.*)', method: RequestMethod.ALL },
    ],
  });
};

export const setupCors = (app: INestApplication, configService: ConfigService) => {
  const allowedOrigins = configService.get<string>('ALLOWED_ORIGINS');
  const legacyCorsOrigin = configService.get<string>('CORS_ORIGIN');
  // Deprecated: CORS_ORIGIN is kept for backwards compatibility. Prefer ALLOWED_ORIGINS.
  const originsString =
    allowedOrigins?.trim()?.length
      ? allowedOrigins
      : legacyCorsOrigin?.trim()?.length
        ? legacyCorsOrigin
        : 'http://localhost:3000';
  const corsOrigins = originsString
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  // The list is expected to include localhost for development, the Vercel deployment domain
  // (https://prueba-salomon.vercel.app), and any custom production domain, separated by commas.
  app.enableCors({
    origin: corsOrigins,
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