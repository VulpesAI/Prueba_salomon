import { registerAs } from '@nestjs/config';
import { DEFAULT_CONFIG } from './default.config';

export default registerAs('app', () => ({
  env: process.env.NODE_ENV || DEFAULT_CONFIG.env,
  port: parseInt(process.env.PORT, 10) || DEFAULT_CONFIG.port,
  database: {
    host: process.env.POSTGRES_HOST || DEFAULT_CONFIG.database.host,
    port: parseInt(process.env.POSTGRES_PORT, 10) || DEFAULT_CONFIG.database.port,
    username: process.env.POSTGRES_USER || DEFAULT_CONFIG.database.username,
    password: process.env.POSTGRES_PASSWORD || DEFAULT_CONFIG.database.password,
    database: process.env.POSTGRES_DB || DEFAULT_CONFIG.database.database,
  },
  jwt: {
    secret: process.env.JWT_SECRET || DEFAULT_CONFIG.jwt.secret,
    expiresIn: process.env.JWT_EXPIRES_IN || DEFAULT_CONFIG.jwt.expiresIn,
  },
  kafka: {
    broker: process.env.KAFKA_BROKER || DEFAULT_CONFIG.kafka.broker,
    clientId: process.env.KAFKA_CLIENT_ID || DEFAULT_CONFIG.kafka.clientId,
  },
  qdrant: {
    url: process.env.QDRANT_URL || DEFAULT_CONFIG.qdrant.url,
    collectionName: process.env.QDRANT_COLLECTION || DEFAULT_CONFIG.qdrant.collectionName,
    apiKey: process.env.QDRANT_API_KEY || DEFAULT_CONFIG.qdrant.apiKey,
  },
  forecasting: {
    engineUrl: process.env.FORECASTING_ENGINE_URL || DEFAULT_CONFIG.forecasting.engineUrl,
    horizonDays: parseInt(process.env.FORECASTING_DEFAULT_HORIZON_DAYS ?? '', 10) || DEFAULT_CONFIG.forecasting.horizonDays,
  },
  recommendations: {
    engineUrl: process.env.RECOMMENDATION_ENGINE_URL || DEFAULT_CONFIG.recommendations.engineUrl,
    timeoutMs: parseInt(process.env.RECOMMENDATION_ENGINE_TIMEOUT_MS ?? '', 10) || DEFAULT_CONFIG.recommendations.timeoutMs,
  },
  api: {
    globalPrefix: DEFAULT_CONFIG.api.globalPrefix,
    corsOrigin: process.env.FRONTEND_URL || DEFAULT_CONFIG.api.corsOrigin,
  },
}));
