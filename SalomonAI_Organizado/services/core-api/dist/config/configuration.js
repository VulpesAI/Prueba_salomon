"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
const default_config_1 = require("./default.config");
exports.default = (0, config_1.registerAs)('app', () => ({
    env: process.env.NODE_ENV || default_config_1.DEFAULT_CONFIG.env,
    port: parseInt(process.env.PORT, 10) || default_config_1.DEFAULT_CONFIG.port,
    database: {
        host: process.env.POSTGRES_HOST || default_config_1.DEFAULT_CONFIG.database.host,
        port: parseInt(process.env.POSTGRES_PORT, 10) || default_config_1.DEFAULT_CONFIG.database.port,
        username: process.env.POSTGRES_USER || default_config_1.DEFAULT_CONFIG.database.username,
        password: process.env.POSTGRES_PASSWORD || default_config_1.DEFAULT_CONFIG.database.password,
        database: process.env.POSTGRES_DB || default_config_1.DEFAULT_CONFIG.database.database,
    },
    jwt: {
        secret: process.env.JWT_SECRET || default_config_1.DEFAULT_CONFIG.jwt.secret,
        expiresIn: process.env.JWT_EXPIRES_IN || default_config_1.DEFAULT_CONFIG.jwt.expiresIn,
    },
    kafka: {
        broker: process.env.KAFKA_BROKER || default_config_1.DEFAULT_CONFIG.kafka.broker,
        clientId: process.env.KAFKA_CLIENT_ID || default_config_1.DEFAULT_CONFIG.kafka.clientId,
    },
    qdrant: {
        url: process.env.QDRANT_URL || default_config_1.DEFAULT_CONFIG.qdrant.url,
        collectionName: process.env.QDRANT_COLLECTION || default_config_1.DEFAULT_CONFIG.qdrant.collectionName,
    },
    forecasting: {
        engineUrl: process.env.FORECASTING_ENGINE_URL || default_config_1.DEFAULT_CONFIG.forecasting.engineUrl,
        horizonDays: parseInt(process.env.FORECASTING_DEFAULT_HORIZON_DAYS ?? '', 10) || default_config_1.DEFAULT_CONFIG.forecasting.horizonDays,
    },
    recommendations: {
        engineUrl: process.env.RECOMMENDATION_ENGINE_URL || default_config_1.DEFAULT_CONFIG.recommendations.engineUrl,
        timeoutMs: parseInt(process.env.RECOMMENDATION_ENGINE_TIMEOUT_MS ?? '', 10) || default_config_1.DEFAULT_CONFIG.recommendations.timeoutMs,
    },
    api: {
        globalPrefix: default_config_1.DEFAULT_CONFIG.api.globalPrefix,
        corsOrigin: process.env.FRONTEND_URL || default_config_1.DEFAULT_CONFIG.api.corsOrigin,
    },
}));
//# sourceMappingURL=configuration.js.map