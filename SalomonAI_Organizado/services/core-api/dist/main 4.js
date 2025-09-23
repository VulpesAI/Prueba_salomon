"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const helmet_1 = require("helmet");
const compression_1 = require("compression");
const app_config_1 = require("./config/app.config");
const nest_winston_1 = require("nest-winston");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        bufferLogs: true,
    });
    const configService = app.get(config_1.ConfigService);
    const logger = app.get(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER);
    app.useLogger(logger);
    app.use((0, helmet_1.default)({
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
    app.use((0, compression_1.default)());
    (0, app_config_1.setupGlobalPipes)(app);
    (0, app_config_1.setupGlobalPrefix)(app, configService);
    (0, app_config_1.setupCors)(app, configService);
    const nodeEnv = configService.get('NODE_ENV', 'development');
    if (nodeEnv !== 'production') {
        (0, app_config_1.setupSwagger)(app);
    }
    app.use((req, res, next) => {
        req.setTimeout(300000);
        next();
    });
    const port = configService.get('API_PORT', 3000);
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
    await app.listen(port, '0.0.0.0');
    logger.log(`🚀 SalomónAI API ejecutándose en: http://0.0.0.0:${port}`);
    logger.log(`📖 Documentación Swagger: http://0.0.0.0:${port}/api/docs`);
    logger.log(`🏥 Health Check: http://0.0.0.0:${port}/api/v1/health`);
    logger.log(`🌍 Environment: ${nodeEnv}`);
}
bootstrap().catch(err => {
    const logger = new common_1.Logger('Bootstrap');
    logger.error('Failed to start application', err);
    process.exit(1);
});
//# sourceMappingURL=main.js.map