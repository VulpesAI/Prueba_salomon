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
  STATEMENTS_BUCKET: Joi.string().default('statements'),
  STATEMENTS_STATUS_TOPIC: Joi.string().default('parsing-engine.statements'),
  STATEMENTS_UPLOAD_DIR: Joi.string().default('/uploads'),
  PARSING_ENGINE_KAFKA_BROKERS: Joi.string().allow('', null).optional(),
  PARSING_ENGINE_TOPIC: Joi.string().default('statements.in'),
  PARSED_STATEMENTS_TOPIC: Joi.string().default('parsing-engine.parsed_statement'),
  PARSED_STATEMENTS_KAFKA_BROKERS: Joi.string().allow('', null).optional(),
  PARSED_STATEMENTS_CONSUMER_GROUP: Joi.string().default('core-api.parsed-statements'),
  PARSED_STATEMENTS_MAX_RETRIES: Joi.number().integer().min(0).default(3),
  PARSED_STATEMENTS_RETRY_DELAY_MS: Joi.number().integer().min(0).default(1000),
  PARSED_STATEMENTS_DLQ_TOPIC: Joi.string().allow('', null).optional(),
  DEMO_MODE: Joi.boolean()
    .truthy('true', '1', 'yes', 'y', 'on')
    .falsy('false', '0', 'no', 'n', 'off')
    .default(false),
  DEFAULT_CURRENCY: Joi.string().default('CLP'),
  DEFAULT_LOCALE: Joi.string().default('es-CL'),
  BELVO_BASE_URL: Joi.string().uri().allow('', null).optional(),
  BELVO_SECRET_ID: Joi.string().allow('', null).optional(),
  BELVO_SECRET_PASSWORD: Joi.string().allow('', null).optional(),
  BELVO_WEBHOOK_SECRET: Joi.string().allow('', null).optional(),
  BELVO_TIMEOUT: Joi.number().integer().min(1000).optional(),
  MOVEMENTS_DEFAULT_PAGE_SIZE: Joi.number().integer().min(1).optional(),
  MOVEMENTS_MAX_PAGE_SIZE: Joi.number().integer().min(1).optional(),
  DASHBOARD_DEFAULT_GRANULARITY: Joi.string().valid('day', 'week', 'month').optional(),
  DASHBOARD_MAX_RANGE_IN_DAYS: Joi.number().integer().min(1).optional(),
  RECOMMENDATION_ENGINE_URL: Joi.string().uri().allow('', null).optional(),
  RECOMMENDATION_ENGINE_TIMEOUT_MS: Joi.number().integer().min(100).optional(),
  RECOMMENDATION_INGEST_INTERVAL_MS: Joi.number().integer().min(1000).optional(),
  FORECASTING_ENGINE_URL: Joi.string().uri().allow('', null).optional(),
  FORECASTING_ENGINE_TIMEOUT_MS: Joi.number().integer().min(100).optional(),
  FORECASTING_DEFAULT_MODEL: Joi.string().valid('auto', 'arima', 'prophet').optional(),
  FORECASTING_DEFAULT_HORIZON_DAYS: Joi.number().integer().min(1).optional(),
});
