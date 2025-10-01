import { z } from 'zod';

const baseEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(3000),
    STRICT_ENV: z.coerce.boolean().default(false),
    POSTGRES_HOST: z.string().min(1).optional(),
    POSTGRES_PORT: z.coerce.number().default(5432),
    POSTGRES_USER: z.string().min(1).optional(),
    POSTGRES_PASSWORD: z.string().min(1).optional(),
    POSTGRES_DB: z.string().min(1).optional(),
    JWT_SECRET: z.string().min(1),
    JWT_EXPIRES_IN: z.string().default('24h'),
    KAFKA_BROKER: z.string().default('kafka:9092'),
    KAFKA_CLIENT_ID: z.string().default('salomon-api'),
    QDRANT_URL: z.string().url().or(z.string().min(1)).optional(),
    QDRANT_COLLECTION: z.string().default('transactions'),
    FRONTEND_URL: z.string().url().or(z.string().min(1)).optional(),
    RECOMMENDATION_ENGINE_URL: z.string().url().or(z.string().min(1)).optional(),
    RECOMMENDATION_ENGINE_TIMEOUT_MS: z.coerce.number().default(8000),
    FORECASTING_ENGINE_URL: z.string().url().or(z.string().min(1)).optional(),
    FORECASTING_DEFAULT_HORIZON_DAYS: z.coerce.number().default(30),
    FORECASTING_DEFAULT_MODEL: z.string().default('auto'),
    FORECASTING_DATABASE_URL: z.string().min(1).optional(),
  })
  .passthrough();

export const envSchema = baseEnvSchema.superRefine((data, ctx) => {
    if (!data.STRICT_ENV) {
      return;
    }

    const strictKeys = [
      'POSTGRES_HOST',
      'POSTGRES_PORT',
      'POSTGRES_USER',
      'POSTGRES_PASSWORD',
      'POSTGRES_DB',
      'QDRANT_URL',
      'FRONTEND_URL',
      'RECOMMENDATION_ENGINE_URL',
    ] as const;

    strictKeys.forEach((key) => {
      const value = data[key];
      if (
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim().length === 0)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: 'Required when STRICT_ENV is enabled.',
        });
      }
    });
  });

export type EnvVars = z.infer<typeof envSchema>;

export type EnvStrictnessMode = 'strict' | 'minimal';

export const getEnvStrictnessMode = (env: EnvVars): EnvStrictnessMode =>
  env.STRICT_ENV ? 'strict' : 'minimal';

export const isStrictEnv = (env: EnvVars): boolean => env.STRICT_ENV;

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

