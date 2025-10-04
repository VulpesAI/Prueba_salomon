import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  ENVIRONMENT: Joi.string().default('development'),
  CORE_API_PROFILE: Joi.string().valid('minimal', 'full').default('minimal'),
  STRICT_ENV: Joi.boolean()
    .truthy('true', '1', 'yes', 'y', 'on')
    .falsy('false', '0', 'no', 'n', 'off')
    .default(false),
  PORT: Joi.number().port().default(8080),
  JWT_SECRET: Joi.string().min(8).default('test-secret'),
  JWT_EXPIRES_IN: Joi.string().default('1h'),
  ALLOWED_ORIGINS: Joi.string().allow('', null).optional(),
  CORS_ORIGIN: Joi.string().allow('', null).optional(),
  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().min(20).required(),
  SUPABASE_JWT_AUDIENCE: Joi.string().allow('', null).optional(),
  DEMO_MODE: Joi.boolean()
    .truthy('true', '1', 'yes', 'y', 'on')
    .falsy('false', '0', 'no', 'n', 'off')
    .default(false),
  DEFAULT_CURRENCY: Joi.string().default('CLP'),
  DEFAULT_LOCALE: Joi.string().default('es-CL')
});
