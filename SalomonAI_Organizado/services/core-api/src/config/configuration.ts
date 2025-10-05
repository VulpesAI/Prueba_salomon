export interface AppConfig {
  environment: string;
  profile: string;
  port: number;
  version: string;
  allowedOrigins: string[];
  globalPrefix: string;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
}

export interface SupabaseConfig {
  url?: string;
  serviceRoleKey?: string;
  jwtAudience?: string;
}

export interface StatementsConfig {
  bucket: string;
  statusTopic: string;
}

export interface ParsingEngineMessagingConfig {
  enabled: boolean;
  topic: string;
  brokers: string[];
}

export interface MessagingConfig {
  parsingEngine: ParsingEngineMessagingConfig;
}

export interface DemoConfig {
  enabled: boolean;
  defaultCurrency: string;
  defaultLocale: string;
}

export interface CoreConfiguration {
  app: AppConfig;
  auth: AuthConfig;
  supabase: SupabaseConfig;
  statements: StatementsConfig;
  messaging: MessagingConfig;
  demo: DemoConfig;
}

const parseAllowedOrigins = (value?: string): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
};

const parseBoolean = (value?: string): boolean => {
  if (!value) {
    return false;
  }

  const normalized = value.toLowerCase();
  return ['true', '1', 'yes', 'y', 'on'].includes(normalized);
};

const parseList = (value?: string): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

export default (): CoreConfiguration => {
  const port = Number(process.env.PORT ?? 8080);
  const parsingEngineTopic = process.env.PARSING_ENGINE_TOPIC ?? 'parsing-engine.statements';
  const parsingEngineBrokers = parseList(process.env.PARSING_ENGINE_KAFKA_BROKERS);

  return {
    app: {
      environment: process.env.ENVIRONMENT ?? 'development',
      profile: process.env.CORE_API_PROFILE ?? 'minimal',
      port: Number.isNaN(port) ? 8080 : port,
      version: process.env.npm_package_version ?? '0.0.0',
      allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS ?? process.env.CORS_ORIGIN),
      globalPrefix: process.env.GLOBAL_PREFIX ?? 'api/v1',
    },
    auth: {
      jwtSecret: process.env.JWT_SECRET ?? '',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
    },
    supabase: {
      url: process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      jwtAudience: process.env.SUPABASE_JWT_AUDIENCE,
    },
    statements: {
      bucket: process.env.STATEMENTS_BUCKET ?? 'statements',
      statusTopic: process.env.STATEMENTS_STATUS_TOPIC ?? 'parsing-engine.statements',
    },
    messaging: {
      parsingEngine: {
        enabled: parsingEngineBrokers.length > 0,
        topic: parsingEngineTopic,
        brokers: parsingEngineBrokers,
      },
    },
    demo: {
      enabled: parseBoolean(process.env.DEMO_MODE),
      defaultCurrency: process.env.DEFAULT_CURRENCY ?? 'CLP',
      defaultLocale: process.env.DEFAULT_LOCALE ?? 'es-CL',
    },
  };
};
