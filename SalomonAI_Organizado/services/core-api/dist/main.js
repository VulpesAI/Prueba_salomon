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
const tls_util_1 = require("./security/tls.util");
const normalizePort = (value) => {
    if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 65535) {
        return value;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length === 0) {
            return undefined;
        }
        const parsed = Number(trimmed);
        if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 65535) {
            return parsed;
        }
    }
    return undefined;
};
async function bootstrap() {
    const httpsOptions = await (0, tls_util_1.loadTlsOptionsFromEnv)();
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        bufferLogs: true,
        ...(httpsOptions ? { httpsOptions } : {}),
    });
    const configService = app.get(config_1.ConfigService);
    const logger = app.get(nest_winston_1.WINSTON_MODULE_NEST_PROVIDER);
    app.useLogger(logger);
    if (httpsOptions) {
        logger.log('🔐 TLS 1.3 habilitado con certificados gestionados vía KMS.');
    }
    else {
        logger.warn('TLS no habilitado. Se ejecutará sobre HTTP hasta que se configuren certificados.');
    }
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
    const configuredPort = configService.get('PORT');
    const normalizedPort = normalizePort(configuredPort);
    let port = normalizedPort;
    if (port === undefined) {
        logger.warn(`Valor de puerto inválido "${configuredPort}" recibido. Usando el puerto por defecto 8080.`);
        port = 8080;
    }
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
    console.log(`[BOOT] PORT=${port}`);
    await app.listen(port, '0.0.0.0');
    logger.log(`🚀 SalomónAI API ejecutándose en: http://0.0.0.0:${port}`);
    logger.log(`📖 Documentación Swagger: http://0.0.0.0:${port}/api/docs`);
    logger.log(`🏥 Health Check: http://0.0.0.0:${port}/health (legacy: http://0.0.0.0:${port}/api/v1/health)`);
    logger.log(`🌍 Environment: ${nodeEnv}`);
}
bootstrap().catch(err => {
    const logger = new common_1.Logger('Bootstrap');
    logger.error('Failed to start application', err);
    process.exit(1);
});
//# sourceMappingURL=main.js.map