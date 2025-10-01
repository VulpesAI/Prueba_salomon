#!/usr/bin/env ts-node
import { loadRootEnv } from '../src/config/env.loader';
import { envSchema, type EnvStrictnessMode } from '../src/config/env.validation';

const hasValue = (value: string | undefined | null): boolean =>
  typeof value === 'string' && value.trim().length > 0;

const formatList = (items: string[]): string =>
  items.length ? items.join(', ') : 'ninguno';

const toBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'y', 'on'].includes(value.toLowerCase());
  }
  return false;
};

const firebaseSecretsSatisfied = (): {
  minimalConfigured: boolean;
  missingMinimal: string[];
  optionalMissing: string[];
  usingServiceAccountKey: boolean;
} => {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (hasValue(serviceAccountKey)) {
    return { minimalConfigured: true, missingMinimal: [], optionalMissing: [], usingServiceAccountKey: true };
  }

  const firebaseMinimalKeys: (keyof NodeJS.ProcessEnv)[] = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
  ];
  const firebaseOptionalKeys: (keyof NodeJS.ProcessEnv)[] = [
    'FIREBASE_PRIVATE_KEY_ID',
    'FIREBASE_CLIENT_ID',
    'FIREBASE_CLIENT_CERT_URL',
    'FIREBASE_DATABASE_URL',
  ];

  const missingMinimal = firebaseMinimalKeys.filter((key) => !hasValue(process.env[key])) as string[];
  const optionalMissing = firebaseOptionalKeys.filter((key) => !hasValue(process.env[key])) as string[];

  return {
    minimalConfigured: missingMinimal.length === 0,
    missingMinimal,
    optionalMissing,
    usingServiceAccountKey: false,
  };
};

const run = (): number => {
  loadRootEnv();

  const validationResult = envSchema.safeParse(process.env);
  const validationIssues = validationResult.success
    ? []
    : validationResult.error.issues.map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`);

  const partialResult = envSchema.partial().safeParse(process.env);
  const envVars = partialResult.success ? partialResult.data : {};
  const strictEnvEnabled = validationResult.success
    ? validationResult.data.STRICT_ENV
    : toBoolean(envVars.STRICT_ENV);
  const strictMode: EnvStrictnessMode = strictEnvEnabled ? 'strict' : 'minimal';

  const dependencyStatuses: { name: string; enabled: boolean; reason?: string }[] = [];

  const databaseKeys: (keyof NodeJS.ProcessEnv)[] = [
    'POSTGRES_HOST',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'POSTGRES_DB',
  ];
  const missingDbKeys = databaseKeys.filter((key) => !hasValue(process.env[key]));
  const databaseEnabled = strictMode === 'strict' || missingDbKeys.length === 0;
  dependencyStatuses.push({
    name: 'Base de datos y módulos dependientes (Auth, Users, Belvo, Forecasts, Alerts, Notifications, Goals, Transactions, Classification, Privacy, Dashboard)',
    enabled: databaseEnabled,
    reason:
      databaseEnabled || strictMode === 'strict'
        ? undefined
        : `Faltan variables: ${formatList(missingDbKeys as string[])}`,
  });

  const kafkaEnabled = strictMode === 'strict' || hasValue(process.env.KAFKA_BROKER);
  dependencyStatuses.push({
    name: 'Kafka',
    enabled: kafkaEnabled,
    reason: kafkaEnabled || strictMode === 'strict' ? undefined : 'Configura KAFKA_BROKER para activarlo.',
  });

  const qdrantEnabled = strictMode === 'strict' || hasValue(process.env.QDRANT_URL);
  dependencyStatuses.push({
    name: 'Qdrant',
    enabled: qdrantEnabled,
    reason: qdrantEnabled || strictMode === 'strict' ? undefined : 'Configura QDRANT_URL para activarlo.',
  });

  const recommendationsEnabled = strictMode === 'strict' || hasValue(process.env.RECOMMENDATION_ENGINE_URL);
  dependencyStatuses.push({
    name: 'Motor de recomendaciones',
    enabled: recommendationsEnabled,
    reason:
      recommendationsEnabled || strictMode === 'strict'
        ? undefined
        : 'Configura RECOMMENDATION_ENGINE_URL para habilitar las recomendaciones.',
  });

  const firebaseStatus = firebaseSecretsSatisfied();

  console.log('🔍  Revisión de entorno para core-api');
  console.log(`• Modo estricto detectado: ${strictMode}`);
  if (strictMode !== 'minimal') {
    console.log('  (El script reporta dependencias considerando el modo mínimo).');
  }

  if (validationIssues.length) {
    console.log('\n⚠️  Variables faltantes o inválidas según el validador:');
    validationIssues.forEach((issue) => console.log(`  - ${issue}`));
  } else {
    console.log('\n✅ Validación de esquema completada sin errores.');
  }

  const missingCriticalItems: string[] = [];
  const jwtSecretPresent = hasValue(process.env.JWT_SECRET);

  if (!jwtSecretPresent) {
    missingCriticalItems.push('JWT_SECRET');
  }

  const requiredForMinimal: { name: string; present: boolean; detail?: string }[] = [
    { name: 'JWT_SECRET', present: jwtSecretPresent },
    {
      name: 'ALLOWED_ORIGINS',
      present: hasValue(process.env.ALLOWED_ORIGINS),
      detail: 'Puedes usar CORS_ORIGIN como respaldo solo si ALLOWED_ORIGINS no está disponible.',
    },
    {
      name: 'Credenciales de Firebase (modo mínimo)',
      present: firebaseStatus.minimalConfigured,
      detail: firebaseStatus.minimalConfigured
        ? undefined
        : `Requeridas para modo mínimo: ${formatList(firebaseStatus.missingMinimal)}`,
    },
  ];

  console.log('\n🔑 Requeridos para arranque mínimo:');
  requiredForMinimal.forEach((item) => {
    console.log(`  - ${item.name}: ${item.present ? 'presente' : 'faltante'}`);
    if (!item.present && item.detail) {
      console.log(`      ${item.detail}`);
    }
  });

  console.log('\n🧩 Estado de dependencias en modo mínimo:');
  dependencyStatuses.forEach((dependency) => {
    console.log(`  - ${dependency.name}: ${dependency.enabled ? 'activado' : 'desactivado'}`);
    if (!dependency.enabled && dependency.reason) {
      console.log(`      ${dependency.reason}`);
    }
  });

  if (firebaseStatus.usingServiceAccountKey) {
    console.log('\nℹ️  Firebase: Se detectó FIREBASE_SERVICE_ACCOUNT_KEY, se omite la verificación de claves individuales.');
  } else if (firebaseStatus.optionalMissing.length) {
    console.log('\nℹ️  Firebase: Claves opcionales ausentes (requeridas para modo completo o características avanzadas):');
    firebaseStatus.optionalMissing.forEach((key) => console.log(`  - ${key}`));
  }

  console.log('\nConsejo: ejecuta este script después de cargar tus variables para verificar el impacto en la configuración.');
  if (missingCriticalItems.length) {
    console.log(`\n❌ Resumen: faltan variables críticas -> ${formatList(missingCriticalItems)}.`);
    return 1;
  }

  console.log('\n✅ Resumen: todas las variables críticas están configuradas.');
  return 0;
};

const exitCode = run();
process.exit(exitCode);
