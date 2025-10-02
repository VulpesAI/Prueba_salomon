"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnv = exports.isStrictEnv = exports.getEnvStrictnessMode = exports.envSchema = void 0;
const zod_1 = require("zod");
const emptyStringToUndefined = (value) => {
    if (typeof value === 'string' && value.trim().length === 0) {
        return undefined;
    }
    return value;
};
const optionalNonEmptyString = () => zod_1.z.preprocess(emptyStringToUndefined, zod_1.z.string().min(1)).optional();
const optionalUrlOrNonEmptyString = () => zod_1.z
    .preprocess(emptyStringToUndefined, zod_1.z.union([zod_1.z.string().url(), zod_1.z.string().min(1)]))
    .optional();
const baseEnvSchema = zod_1.z
    .object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.coerce.number().default(8080),
    STRICT_ENV: zod_1.z.coerce.boolean().default(false),
    POSTGRES_HOST: optionalNonEmptyString(),
    POSTGRES_PORT: zod_1.z.coerce.number().default(5432),
    POSTGRES_USER: optionalNonEmptyString(),
    POSTGRES_PASSWORD: optionalNonEmptyString(),
    POSTGRES_DB: optionalNonEmptyString(),
    JWT_SECRET: zod_1.z
        .string({
        required_error: 'JWT_SECRET is required. Generate one with: openssl rand -base64 32',
    })
        .min(1, 'JWT_SECRET is required. Generate one with: openssl rand -base64 32'),
    JWT_EXPIRES_IN: zod_1.z.string().default('24h'),
    KAFKA_BROKER: zod_1.z.string().default('kafka:9092'),
    KAFKA_CLIENT_ID: zod_1.z.string().default('salomon-api'),
    QDRANT_URL: optionalUrlOrNonEmptyString(),
    QDRANT_COLLECTION: zod_1.z.string().default('transactions'),
    FRONTEND_URL: optionalUrlOrNonEmptyString(),
    RECOMMENDATION_ENGINE_URL: optionalUrlOrNonEmptyString(),
    RECOMMENDATION_ENGINE_TIMEOUT_MS: zod_1.z.coerce.number().default(8000),
    FORECASTING_ENGINE_URL: optionalUrlOrNonEmptyString(),
    FORECASTING_DEFAULT_HORIZON_DAYS: zod_1.z.coerce.number().default(30),
    FORECASTING_DEFAULT_MODEL: zod_1.z.string().default('auto'),
    FORECASTING_DATABASE_URL: optionalNonEmptyString(),
    FIREBASE_PROJECT_ID: zod_1.z.string().min(1),
    FIREBASE_CLIENT_EMAIL: zod_1.z.string().email(),
    FIREBASE_PRIVATE_KEY: zod_1.z.string().min(1),
})
    .passthrough();
exports.envSchema = baseEnvSchema.superRefine((data, ctx) => {
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
    ];
    strictKeys.forEach((key) => {
        const value = data[key];
        if (value === undefined ||
            value === null ||
            (typeof value === 'string' && value.trim().length === 0)) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: [key],
                message: 'Required when STRICT_ENV is enabled.',
            });
        }
    });
});
const getEnvStrictnessMode = (env) => env.STRICT_ENV ? 'strict' : 'minimal';
exports.getEnvStrictnessMode = getEnvStrictnessMode;
const isStrictEnv = (env) => env.STRICT_ENV;
exports.isStrictEnv = isStrictEnv;
const validateEnv = (config) => {
    const result = exports.envSchema.safeParse(config);
    if (!result.success) {
        const formatted = result.error.issues
            .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
            .join('\n');
        throw new Error(`Invalid environment configuration:\n${formatted}`);
    }
    return result.data;
};
exports.validateEnv = validateEnv;
//# sourceMappingURL=env.validation.js.map