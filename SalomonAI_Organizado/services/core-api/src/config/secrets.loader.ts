import { SECRETS } from './secrets';

const TRUTHY_VALUES = new Set(['true', '1', 'yes', 'y', 'on']);

const isTruthy = (value: string | undefined): boolean =>
  typeof value === 'string' && TRUTHY_VALUES.has(value.trim().toLowerCase());

const setEnvIfMissing = (key: string, value?: string | number): void => {
  if (typeof value === 'undefined' || value === null) {
    return;
  }

  const stringValue = String(value);
  if (stringValue.length === 0) {
    return;
  }

  if (typeof process.env[key] === 'undefined' || process.env[key] === '') {
    process.env[key] = stringValue;
  }
};

const reportError = (error: unknown): void => {
  const message =
    error instanceof Error ? error.message : 'Fallo desconocido al cargar secrets.enc.json.';
  // eslint-disable-next-line no-console -- Se ejecuta antes de que exista el logger de NestJS
  console.warn(`[core-api][secrets] ${message}`);
};

export const injectSecretsIntoEnv = (): void => {
  const strictMode = isTruthy(process.env.STRICT_ENV);
  const passphrase = process.env.SECRET_PASSPHRASE;

  if (!passphrase || passphrase.trim().length === 0) {
    if (strictMode) {
      throw new Error(
        'STRICT_ENV está habilitado pero SECRET_PASSPHRASE no está definido. No se pueden cargar los secretos cifrados.',
      );
    }
    return;
  }

  try {
    const jwtSecrets = SECRETS.jwt();
    const firebaseSecrets = SECRETS.firebase();
    const supabaseSecrets = SECRETS.supabase();

    setEnvIfMissing('JWT_SECRET', jwtSecrets.secret);
    setEnvIfMissing('JWT_REFRESH_SECRET', jwtSecrets.refreshSecret);

    setEnvIfMissing('FIREBASE_PROJECT_ID', firebaseSecrets.projectId);
    setEnvIfMissing('FIREBASE_CLIENT_EMAIL', firebaseSecrets.clientEmail);
    setEnvIfMissing('FIREBASE_PRIVATE_KEY', firebaseSecrets.privateKey);
    setEnvIfMissing('FIREBASE_DATABASE_URL', firebaseSecrets.databaseUrl);
    setEnvIfMissing('FIREBASE_SERVICE_ACCOUNT_KEY', firebaseSecrets.serviceAccountKey);

    setEnvIfMissing('SUPABASE_URL', supabaseSecrets.url);
    setEnvIfMissing('SUPABASE_SERVICE_ROLE_KEY', supabaseSecrets.serviceRoleKey);
    setEnvIfMissing('SUPABASE_ANON_KEY', supabaseSecrets.anonKey);
  } catch (error) {
    if (strictMode) {
      throw error instanceof Error
        ? error
        : new Error('Ocurrió un error inesperado al cargar los secretos cifrados.');
    }

    reportError(error);
  }
};
