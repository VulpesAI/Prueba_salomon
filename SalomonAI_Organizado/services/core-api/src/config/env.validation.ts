import { z } from 'zod';

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(3000),
    POSTGRES_HOST: z.string().min(1),
    POSTGRES_PORT: z.coerce.number().default(5432),
    POSTGRES_USER: z.string().min(1),
    POSTGRES_PASSWORD: z.string().min(1),
    POSTGRES_DB: z.string().min(1),
    JWT_SECRET: z.string().min(1),
    JWT_EXPIRES_IN: z.string().default('24h'),
    KAFKA_BROKER: z.string().default('kafka:9092'),
    KAFKA_CLIENT_ID: z.string().default('salomon-api'),
    QDRANT_URL: z.string().url().or(z.string().min(1)),
    QDRANT_COLLECTION: z.string().default('transactions'),
    FRONTEND_URL: z.string().url().or(z.string().min(1)),
    RECOMMENDATION_ENGINE_URL: z.string().url().or(z.string().min(1)),
    RECOMMENDATION_ENGINE_TIMEOUT_MS: z.coerce.number().default(8000),
    FORECASTING_ENGINE_URL: z.string().url().or(z.string().min(1)).optional(),
    FORECASTING_DEFAULT_HORIZON_DAYS: z.coerce.number().default(30),
    FORECASTING_DEFAULT_MODEL: z.string().default('auto'),
    FORECASTING_DATABASE_URL: z.string().min(1).optional(),
  })
  .passthrough();

export type EnvVars = z.infer<typeof envSchema>;

export const validateEnv = (config: Record<string, unknown>) => {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${formatted}`);
  }
  return result.data;
};

