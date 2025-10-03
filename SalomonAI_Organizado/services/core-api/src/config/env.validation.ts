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
  ENABLE_FIREBASE: Joi.boolean().truthy('true').falsy('false').default(false),
  FIREBASE_PROJECT_ID: Joi.string().when('ENABLE_FIREBASE', {
    is: true,
    then: Joi.string().required(),
    otherwise: Joi.string().allow('', null).optional()
  }),
  FIREBASE_CLIENT_EMAIL: Joi.string().email().when('ENABLE_FIREBASE', {
    is: true,
    then: Joi.string().required(),
    otherwise: Joi.string().allow('', null).optional()
  }),
  FIREBASE_PRIVATE_KEY: Joi.string().when('ENABLE_FIREBASE', {
    is: true,
    then: Joi.string().required(),
    otherwise: Joi.string().allow('', null).optional()
  }),
  FIREBASE_SERVICE_ACCOUNT_KEY: Joi.string().allow('', null).optional(),
  FIREBASE_DATABASE_URL: Joi.string().uri().allow('', null).optional(),
  FIREBASE_PRIVATE_KEY_ID: Joi.string().allow('', null).optional(),
  FIREBASE_CLIENT_ID: Joi.string().allow('', null).optional(),
  FIREBASE_CLIENT_CERT_URL: Joi.string().uri().allow('', null).optional(),
  FIREBASE_AUTH_PROVIDER_X509_CERT_URL: Joi.string().uri().allow('', null).optional(),
  FIREBASE_TOKEN_URI: Joi.string().uri().allow('', null).optional()
});
