export const DEFAULT_CONFIG = {
  env: 'development',
  port: 3000,
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
  api: {
    globalPrefix: 'api/v1',
    corsOrigin: 'http://localhost:3001',
  },
} as const;
