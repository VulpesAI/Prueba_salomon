"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSwagger = exports.setupCors = exports.setupGlobalPrefix = exports.setupGlobalPipes = exports.createJwtConfig = exports.createThrottlerConfig = exports.createCacheConfig = exports.createQdrantConfig = exports.createDatabaseConfig = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const createDatabaseConfig = (configService) => ({
    type: 'postgres',
    host: configService.get('POSTGRES_HOST', 'postgres'),
    port: configService.get('POSTGRES_PORT', 5432),
    username: configService.get('POSTGRES_USER', 'salomon_user'),
    password: configService.get('POSTGRES_PASSWORD'),
    database: configService.get('POSTGRES_DB', 'salomon_db'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    synchronize: configService.get('NODE_ENV') !== 'production',
    logging: configService.get('NODE_ENV') !== 'production',
    ssl: false,
    extra: {
        max: 20,
        connectionTimeoutMillis: 30000,
        idleTimeoutMillis: 30000,
    },
});
exports.createDatabaseConfig = createDatabaseConfig;
const createQdrantConfig = (configService) => ({
    url: configService.get('QDRANT_URL', 'http://qdrant:6333'),
    host: configService.get('QDRANT_HOST', 'qdrant'),
    port: configService.get('QDRANT_PORT', 6333),
    collectionName: configService.get('QDRANT_COLLECTION_NAME', 'financial_transactions'),
});
exports.createQdrantConfig = createQdrantConfig;
const createCacheConfig = (configService) => ({
    ttl: configService.get('CACHE_TTL', 3600) * 1000,
    max: 100,
    store: 'memory',
});
exports.createCacheConfig = createCacheConfig;
const createThrottlerConfig = (configService) => [
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
exports.createThrottlerConfig = createThrottlerConfig;
const createJwtConfig = (configService) => ({
    secret: configService.get('JWT_SECRET'),
    signOptions: {
        expiresIn: configService.get('JWT_EXPIRES_IN', '24h'),
    },
});
exports.createJwtConfig = createJwtConfig;
const setupGlobalPipes = (app) => {
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
};
exports.setupGlobalPipes = setupGlobalPipes;
const setupGlobalPrefix = (app, configService) => {
    app.setGlobalPrefix('api/v1');
};
exports.setupGlobalPrefix = setupGlobalPrefix;
const setupCors = (app, configService) => {
    const corsOrigins = configService.get('CORS_ORIGIN', 'http://localhost:3001');
    app.enableCors({
        origin: corsOrigins.split(','),
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    });
};
exports.setupCors = setupCors;
const setupSwagger = (app) => {
    const config = new swagger_1.DocumentBuilder()
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
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
            tagsSorter: 'alpha',
            operationsSorter: 'alpha',
        },
    });
};
exports.setupSwagger = setupSwagger;
//# sourceMappingURL=app.config.js.map