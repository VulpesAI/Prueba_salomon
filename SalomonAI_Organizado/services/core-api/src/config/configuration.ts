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

export interface FirebaseConfig {
  enabled: boolean;
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
  serviceAccountKey?: string;
  databaseURL?: string;
}

export interface CoreConfiguration {
  app: AppConfig;
  auth: AuthConfig;
  firebase: FirebaseConfig;
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

export default (): CoreConfiguration => {
  const port = Number(process.env.PORT ?? 8080);

  return {
    app: {
      environment: process.env.ENVIRONMENT ?? 'development',
      profile: process.env.CORE_API_PROFILE ?? 'minimal',
      port: Number.isNaN(port) ? 8080 : port,
      version: process.env.npm_package_version ?? '0.0.0',
      allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS ?? process.env.CORS_ORIGIN),
      globalPrefix: process.env.GLOBAL_PREFIX ?? 'api/v1'
    },
    auth: {
      jwtSecret: process.env.JWT_SECRET ?? '',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1h'
    },
    firebase: {
      enabled: (process.env.ENABLE_FIREBASE ?? 'false').toLowerCase() === 'true',
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      serviceAccountKey: process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
      databaseURL: process.env.FIREBASE_DATABASE_URL
    }
  };
};
