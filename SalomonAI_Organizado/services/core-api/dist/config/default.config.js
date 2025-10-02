"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = void 0;
exports.DEFAULT_CONFIG = {
    env: 'development',
    port: 8080,
    database: {
        host: 'postgres',
        port: 5432,
        username: 'postgres',
        password: 'postgres',
        database: 'salomon',
    },
    jwt: {
        secret: 'your-secret-key',
        expiresIn: '24h',
    },
    kafka: {
        broker: 'kafka:9092',
        clientId: 'salomon-api',
    },
    qdrant: {
        url: 'http://qdrant:6333',
        collectionName: 'transactions',
    },
    forecasting: {
        engineUrl: 'http://forecasting-engine:8003',
        horizonDays: 30,
    },
    recommendations: {
        engineUrl: 'http://recommendation-engine:8004',
        timeoutMs: 8000,
    },
    api: {
        globalPrefix: 'api/v1',
        corsOrigin: 'http://localhost:3001',
    },
};
//# sourceMappingURL=default.config.js.map