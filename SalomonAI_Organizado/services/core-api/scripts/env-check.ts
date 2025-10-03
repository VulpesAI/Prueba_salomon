#!/usr/bin/env ts-node
import configuration from '../src/config/configuration';
import { loadRootEnv } from '../src/config/env.loader';
import { envValidationSchema } from '../src/config/env.validation';

type EnvStrictnessMode = 'minimal' | 'strict';

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

const firebaseSecretsSatisfied = (firebaseEnabled: boolean): {
  minimalConfigured: boolean;
  missingMinimal: string[];
  optionalMissing: string[];
  usingServiceAccountKey: boolean;
} => {
  if (!firebaseEnabled) {
    return {
      minimalConfigured: true,
      missingMinimal: [],
      optionalMissing: [],
      usingServiceAccountKey: false,
    };
  }

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

  const { error, value } = envValidationSchema.validate(process.env, {
    abortEarly: false,
    allowUnknown: true,
    convert: true,
  });
  const validationIssues = error
    ? error.details.map((detail) => `${detail.path.join('.') || 'env'}: ${detail.message}`)
    : [];

  const validatedEnv = value as { STRICT_ENV?: boolean };
  const strictEnvEnabled = typeof validatedEnv.STRICT_ENV === 'boolean'
    ? validatedEnv.STRICT_ENV
    : toBoolean(process.env.STRICT_ENV);
  const strictMode: EnvStrictnessMode = strictEnvEnabled ? 'strict' : 'minimal';
  const isStrictMode = strictMode === 'strict';
  const appConfig = configuration();
  const firebaseEnabled = appConfig.firebase.enabled;

  const dependencyStatuses: { name: string; enabled: boolean; reason?: string }[] = [];

  const databaseKeys: (keyof NodeJS.ProcessEnv)[] = [
    'POSTGRES_HOST',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'POSTGRES_DB',
  ];
  const missingDbKeys = databaseKeys.filter((key) => !hasValue(process.env[key]));
  const databaseEnabled = missingDbKeys.length === 0 || isStrictMode;
  dependencyStatuses.push({
    name: 'Base de datos y módulos dependientes (Auth, Users, Belvo, Forecasts, Alerts, Notifications, Goals, Transactions, Classification, Privacy, Dashboard)',
    enabled: databaseEnabled,
    reason:
      databaseEnabled || isStrictMode
        ? undefined
        : `Faltan variables: ${formatList(missingDbKeys as string[])}`,
  });

  const kafkaEnabled = hasValue(process.env.KAFKA_BROKER) || isStrictMode;
  dependencyStatuses.push({
    name: 'Kafka',
    enabled: kafkaEnabled,
    reason: kafkaEnabled || isStrictMode ? undefined : 'Configura KAFKA_BROKER para activarlo.',
  });

  const qdrantEnabled = hasValue(process.env.QDRANT_URL) || isStrictMode;
  dependencyStatuses.push({
    name: 'Qdrant',
    enabled: qdrantEnabled,
    reason: qdrantEnabled || isStrictMode ? undefined : 'Configura QDRANT_URL para activarlo.',
  });

  const recommendationsEnabled = hasValue(process.env.RECOMMENDATION_ENGINE_URL) || isStrictMode;
  dependencyStatuses.push({
    name: 'Motor de recomendaciones',
    enabled: recommendationsEnabled,
    reason:
      recommendationsEnabled || isStrictMode
        ? undefined
        : 'Configura RECOMMENDATION_ENGINE_URL para habilitar las recomendaciones.',
  });

  const firebaseStatus = firebaseSecretsSatisfied(firebaseEnabled);

  console.log('🔍  Revisión de entorno para core-api');
  console.log(`• Modo estricto detectado: ${strictMode}`);
  console.log(`• Perfil configurado: ${appConfig.app.profile}`);
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

  const allowedOriginsPresent = hasValue(process.env.ALLOWED_ORIGINS);

  const requiredForMinimal: { name: string; present: boolean; detail?: string }[] = [
    { name: 'JWT_SECRET', present: jwtSecretPresent },
    {
      name: 'ALLOWED_ORIGINS',
      present: allowedOriginsPresent,
      detail: 'Puedes usar CORS_ORIGIN como respaldo solo si ALLOWED_ORIGINS no está disponible.',
    },
    {
      name: 'Configuración de Firebase',
      present: firebaseStatus.minimalConfigured,
      detail: firebaseEnabled
        ? !firebaseStatus.minimalConfigured
          ? `Requeridas para modo completo: ${formatList(firebaseStatus.missingMinimal)}`
          : undefined
        : 'Firebase Admin se encuentra deshabilitado.',
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

  if (!firebaseEnabled) {
    console.log('\nℹ️  Firebase: Firebase Admin deshabilitado. No se requieren claves.');
  } else if (firebaseStatus.usingServiceAccountKey) {
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
