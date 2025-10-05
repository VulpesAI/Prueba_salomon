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
  results: ResultsMessagingConfig;
}

export interface DemoConfig {
  enabled: boolean;
  defaultCurrency: string;
  defaultLocale: string;
}

export interface ResultsMessagingConfig {
  enabled: boolean;
  topic: string;
  groupId: string;
  brokers: string[];
}

export interface BelvoConfig {
  enabled: boolean;
  baseUrl?: string;
  secretId?: string;
  secretPassword?: string;
  webhookSecret?: string;
  timeoutMs: number;
}

export interface DashboardConfig {
  defaultGranularity: 'day' | 'week' | 'month';
  maxRangeInDays: number;
}

export interface MovementsConfig {
  defaultPageSize: number;
  maxPageSize: number;
}

export interface CoreConfiguration {
  app: AppConfig;
  auth: AuthConfig;
  supabase: SupabaseConfig;
  statements: StatementsConfig;
  messaging: MessagingConfig;
  demo: DemoConfig;
  belvo: BelvoConfig;
  dashboard: DashboardConfig;
  movements: MovementsConfig;
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
  const resultsTopic =
    process.env.PARSED_STATEMENTS_TOPIC ?? 'parsing-engine.parsed_statement';
  const resultsBrokers = parseList(
    process.env.PARSED_STATEMENTS_KAFKA_BROKERS ?? process.env.PARSING_ENGINE_KAFKA_BROKERS,
  );
  const resultsGroupId =
    process.env.PARSED_STATEMENTS_CONSUMER_GROUP ?? 'core-api.parsed-statements';
  const belvoTimeout = Number(process.env.BELVO_TIMEOUT ?? 15000);
  const defaultPageSize = Number(process.env.MOVEMENTS_DEFAULT_PAGE_SIZE ?? 25);
  const maxPageSize = Number(process.env.MOVEMENTS_MAX_PAGE_SIZE ?? 200);
  const dashboardGranularity =
    (process.env.DASHBOARD_DEFAULT_GRANULARITY as DashboardConfig['defaultGranularity']) ??
    'month';
  const dashboardMaxRange = Number(process.env.DASHBOARD_MAX_RANGE_IN_DAYS ?? 365);

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
      results: {
        enabled: resultsBrokers.length > 0,
        topic: resultsTopic,
        groupId: resultsGroupId,
        brokers: resultsBrokers,
      },
    },
    demo: {
      enabled: parseBoolean(process.env.DEMO_MODE),
      defaultCurrency: process.env.DEFAULT_CURRENCY ?? 'CLP',
      defaultLocale: process.env.DEFAULT_LOCALE ?? 'es-CL',
    },
    belvo: {
      enabled:
        Boolean(process.env.BELVO_SECRET_ID) && Boolean(process.env.BELVO_SECRET_PASSWORD),
      baseUrl: process.env.BELVO_BASE_URL ?? 'https://sandbox.belvo.com',
      secretId: process.env.BELVO_SECRET_ID ?? undefined,
      secretPassword: process.env.BELVO_SECRET_PASSWORD ?? undefined,
      webhookSecret: process.env.BELVO_WEBHOOK_SECRET ?? undefined,
      timeoutMs: Number.isNaN(belvoTimeout) ? 15000 : belvoTimeout,
    },
    dashboard: {
      defaultGranularity: ['day', 'week', 'month'].includes(dashboardGranularity)
        ? dashboardGranularity
        : 'month',
      maxRangeInDays: Number.isNaN(dashboardMaxRange) ? 365 : dashboardMaxRange,
    },
    movements: {
      defaultPageSize: Number.isNaN(defaultPageSize) ? 25 : defaultPageSize,
      maxPageSize: Number.isNaN(maxPageSize) ? 200 : maxPageSize,
    },
  };
};
