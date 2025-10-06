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

  const forecastingEnabled = hasValue(process.env.FORECASTING_ENGINE_URL) || isStrictMode;
  dependencyStatuses.push({
    name: 'Motor de proyecciones financieras',
    enabled: forecastingEnabled,
    reason:
      forecastingEnabled || isStrictMode
        ? undefined
        : 'Configura FORECASTING_ENGINE_URL para habilitar las proyecciones.',
  });

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
  const supabaseJwtSecretPresent =
    hasValue(process.env.SUPABASE_JWT_SECRET) || hasValue(process.env.JWT_SECRET);

  if (!supabaseJwtSecretPresent) {
    missingCriticalItems.push('SUPABASE_JWT_SECRET');
  }

  const allowedOriginsPresent = hasValue(process.env.ALLOWED_ORIGINS);
  const supabaseUrlPresent = hasValue(process.env.SUPABASE_URL);
  const supabaseServiceRolePresent = hasValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!supabaseUrlPresent) {
    missingCriticalItems.push('SUPABASE_URL');
  }

  if (!supabaseServiceRolePresent) {
    missingCriticalItems.push('SUPABASE_SERVICE_ROLE_KEY');
  }

  const requiredForMinimal: { name: string; present: boolean; detail?: string }[] = [
    {
      name: 'SUPABASE_JWT_SECRET',
      present: supabaseJwtSecretPresent,
      detail: supabaseJwtSecretPresent
        ? undefined
        : 'Copia el JWT Secret del proyecto en Supabase (Project Settings → API) y configúralo como SUPABASE_JWT_SECRET.',
    },
    {
      name: 'ALLOWED_ORIGINS',
      present: allowedOriginsPresent,
      detail: 'Puedes usar CORS_ORIGIN como respaldo solo si ALLOWED_ORIGINS no está disponible.',
    },
    {
      name: 'SUPABASE_URL',
      present: supabaseUrlPresent,
      detail: supabaseUrlPresent
        ? undefined
        : 'Obtén la URL desde Project Settings → API en la consola de Supabase.',
    },
    {
      name: 'SUPABASE_SERVICE_ROLE_KEY',
      present: supabaseServiceRolePresent,
      detail: supabaseServiceRolePresent
        ? undefined
        : 'Copia el Service Role Key desde Project Settings → API en Supabase y guárdalo como secreto.',
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

  if (!supabaseUrlPresent || !supabaseServiceRolePresent) {
    console.log('\nℹ️  Supabase: faltan credenciales obligatorias para validar sesiones.');
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
