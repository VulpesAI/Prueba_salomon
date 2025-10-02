import { z } from 'zod';

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value === 'string' && value.trim().length === 0) {
    return undefined;
  }
  return value;
};

const optionalNonEmptyString = () =>
  z.preprocess(emptyStringToUndefined, z.string().min(1)).optional();

const optionalEmail = () =>
  z.preprocess(emptyStringToUndefined, z.string().email()).optional();

const optionalUrlOrNonEmptyString = () =>
  z
    .preprocess(
      emptyStringToUndefined,
      z.union([z.string().url(), z.string().min(1)]),
    )
    .optional();

export const baseEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    CORE_API_PROFILE: z.enum(['minimal', 'full']).default('minimal'),
    PORT: z
      .preprocess((value) => {
        const normalized = emptyStringToUndefined(value);
        if (normalized === undefined) {
          return undefined;
        }

        if (typeof normalized === 'number') {
          return normalized;
        }

        if (typeof normalized === 'string') {
          const parsed = Number(normalized);
          return Number.isNaN(parsed) ? normalized : parsed;
        }

        return normalized;
      }, z.number().int().min(1).max(65535).optional())
      .default(8080),
    STRICT_ENV: z.coerce.boolean().default(false),
    ENABLE_FIREBASE: z.coerce.boolean().default(false),
    POSTGRES_HOST: optionalNonEmptyString(),
    POSTGRES_PORT: z.coerce.number().default(5432),
    POSTGRES_USER: optionalNonEmptyString(),
    POSTGRES_PASSWORD: optionalNonEmptyString(),
    POSTGRES_DB: optionalNonEmptyString(),
    JWT_SECRET: z
      .string({
        required_error:
          'JWT_SECRET is required. Generate one with: openssl rand -base64 32',
      })
      .min(1, 'JWT_SECRET is required. Generate one with: openssl rand -base64 32'),
    JWT_EXPIRES_IN: z.string().default('24h'),
    KAFKA_BROKER: z.string().default('kafka:9092'),
    KAFKA_CLIENT_ID: z.string().default('salomon-api'),
    QDRANT_URL: optionalUrlOrNonEmptyString(),
    QDRANT_COLLECTION: z.string().default('transactions'),
    QDRANT_API_KEY: optionalNonEmptyString(),
    FRONTEND_URL: optionalUrlOrNonEmptyString(),
    RECOMMENDATION_ENGINE_URL: optionalUrlOrNonEmptyString(),
    RECOMMENDATION_ENGINE_TIMEOUT_MS: z.coerce.number().default(8000),
    FORECASTING_ENGINE_URL: optionalUrlOrNonEmptyString(),
    FORECASTING_DEFAULT_HORIZON_DAYS: z.coerce.number().default(30),
    FORECASTING_DEFAULT_MODEL: z.string().default('auto'),
    FORECASTING_DATABASE_URL: optionalNonEmptyString(),
    FIREBASE_SERVICE_ACCOUNT_KEY: optionalNonEmptyString(),
    FIREBASE_PROJECT_ID: optionalNonEmptyString(),
    FIREBASE_CLIENT_EMAIL: optionalEmail(),
    FIREBASE_PRIVATE_KEY: optionalNonEmptyString(),
    FIREBASE_PRIVATE_KEY_ID: optionalNonEmptyString(),
    FIREBASE_CLIENT_ID: optionalNonEmptyString(),
    FIREBASE_CLIENT_CERT_URL: optionalUrlOrNonEmptyString(),
    FIREBASE_DATABASE_URL: optionalUrlOrNonEmptyString(),
  })
  .passthrough();

export const envSchema = baseEnvSchema.superRefine((data, ctx) => {
  if (data.ENABLE_FIREBASE) {
    const serviceAccountKey = data.FIREBASE_SERVICE_ACCOUNT_KEY;
    const hasServiceAccountKey =
      typeof serviceAccountKey === 'string' && serviceAccountKey.trim().length > 0;

    if (!hasServiceAccountKey) {
      const firebaseKeys = [
        'FIREBASE_PROJECT_ID',
        'FIREBASE_CLIENT_EMAIL',
        'FIREBASE_PRIVATE_KEY',
        'FIREBASE_PRIVATE_KEY_ID',
        'FIREBASE_CLIENT_ID',
      ] as const;

      firebaseKeys.forEach((key) => {
        const value = data[key];
        if (
          value === undefined ||
          value === null ||
          (typeof value === 'string' && value.trim().length === 0)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: 'Required when ENABLE_FIREBASE is true.',
          });
        }
      });
    }
  }

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
export type EnvProfile = 'minimal' | 'full';

export const getEnvStrictnessMode = (env: EnvVars): EnvStrictnessMode =>
  env.STRICT_ENV ? 'strict' : 'minimal';

export const getEnvProfile = (env: EnvVars): EnvProfile => env.CORE_API_PROFILE;

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

