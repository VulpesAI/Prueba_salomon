import { createDecipheriv, scryptSync } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import * as Joi from 'joi';

interface RawEncryptedPayload {
  version: unknown;
  algorithm: unknown;
  salt: unknown;
  iv: unknown;
  tag: unknown;
  ciphertext: unknown;
}

interface EncryptedPayload {
  version: number;
  algorithm: 'aes-256-gcm';
  salt: Buffer;
  iv: Buffer;
  tag: Buffer;
  ciphertext: Buffer;
}

export interface SupabaseSecrets {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
}

export interface PostgresSecrets {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface FirebaseSecrets {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  databaseUrl?: string;
  serviceAccountKey?: string;
}

export interface QdrantSecrets {
  url: string;
  apiKey: string;
  collection?: string;
  clusterId?: string;
}

export interface ForecastingSecrets {
  databaseUrl: string;
  defaultModel?: string;
  defaultHorizonDays?: number;
}

export interface JwtSecrets {
  secret: string;
  refreshSecret?: string;
}

export interface OpenAISecrets {
  apiKey: string;
  organizationId?: string;
}

export interface EmailSecrets {
  apiKey: string;
  from?: string;
}

export interface StorageSecrets {
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  bucket?: string;
}

export interface MonitoringSecrets {
  sentryDsn?: string;
  mixpanelToken?: string;
}

export interface StripeSecrets {
  publishableKey?: string;
  secretKey?: string;
  webhookSecret?: string;
}

export interface SmsSecrets {
  accountSid?: string;
  authToken?: string;
  phoneNumber?: string;
}

export interface IntegrationsSecrets {
  openai?: OpenAISecrets;
  email?: EmailSecrets;
  storage?: StorageSecrets;
  monitoring?: MonitoringSecrets;
  stripe?: StripeSecrets;
  sms?: SmsSecrets;
}

export interface SecretsShape {
  supabase: SupabaseSecrets;
  postgres: PostgresSecrets;
  firebase: FirebaseSecrets;
  qdrant?: QdrantSecrets;
  forecasting?: ForecastingSecrets;
  jwt: JwtSecrets;
  integrations?: IntegrationsSecrets;
}

type SecretsAccessors = {
  readonly [K in keyof SecretsShape]: () => SecretsShape[K];
};

const ENCRYPTED_FILE_NAME = 'secrets.enc.json';
const OPTIONAL_EMPTY = ['', null];

let cachedSecrets: SecretsShape | null = null;

const ensurePassphrase = (): string => {
  const passphrase = process.env.SECRET_PASSPHRASE;
  if (typeof passphrase !== 'string' || passphrase.trim().length === 0) {
    throw new Error(
      'SECRET_PASSPHRASE no está definido. Define la variable de entorno antes de iniciar la aplicación.',
    );
  }

  if (passphrase.length < 12) {
    throw new Error(
      'SECRET_PASSPHRASE debe tener al menos 12 caracteres para derivar una clave AES-256 segura.',
    );
  }

  return passphrase;
};

const decodeBase64 = (value: string, field: string): Buffer => {
  try {
    const normalized = value.replace(/\s+/g, '');
    const buffer = Buffer.from(normalized, 'base64');
    if (buffer.length === 0 || buffer.toString('base64') !== normalized) {
      throw new Error('');
    }
    return buffer;
  } catch {
    throw new Error(`El campo ${field} no es una cadena base64 válida en secrets.enc.json.`);
  }
};

const loadEncryptedPayload = (): EncryptedPayload => {
  const candidatePaths = [
    path.resolve(__dirname, '..', '..', 'secrets', ENCRYPTED_FILE_NAME),
    path.resolve(__dirname, '..', 'secrets', ENCRYPTED_FILE_NAME),
  ];

  const encryptedPath = candidatePaths.find((candidate) => existsSync(candidate));

  if (!encryptedPath) {
    const locations = candidatePaths.join(', ');
    throw new Error(
      `No se encontró ${ENCRYPTED_FILE_NAME} en ninguna de las rutas esperadas (${locations}). Ejecuta scripts/seal-secrets.ts para generarlo a partir de secrets.local.json.`,
    );
  }

  let parsed: RawEncryptedPayload;
  try {
    const raw = readFileSync(encryptedPath, 'utf8');
    parsed = JSON.parse(raw) as RawEncryptedPayload;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`El archivo ${ENCRYPTED_FILE_NAME} contiene JSON inválido.`);
    }
    throw error;
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`El archivo ${ENCRYPTED_FILE_NAME} debe contener un objeto JSON.`);
  }

  const { version, algorithm, salt, iv, tag, ciphertext } = parsed;

  if (version !== 1) {
    throw new Error(`Versión de paquete de secretos no soportada: ${String(version)}.`);
  }

  if (algorithm !== 'aes-256-gcm') {
    throw new Error(`Algoritmo de cifrado no soportado: ${String(algorithm)}.`);
  }

  if (
    typeof salt !== 'string' ||
    typeof iv !== 'string' ||
    typeof tag !== 'string' ||
    typeof ciphertext !== 'string'
  ) {
    throw new Error(
      'Los campos salt, iv, tag y ciphertext deben ser cadenas base64 en secrets.enc.json.',
    );
  }

  return {
    version: 1,
    algorithm: 'aes-256-gcm',
    salt: decodeBase64(salt, 'salt'),
    iv: decodeBase64(iv, 'iv'),
    tag: decodeBase64(tag, 'tag'),
    ciphertext: decodeBase64(ciphertext, 'ciphertext'),
  };
};

const decryptPayload = (payload: EncryptedPayload, passphrase: string): string => {
  try {
    const key = scryptSync(passphrase, payload.salt, 32);
    const decipher = createDecipheriv(payload.algorithm, key, payload.iv);
    decipher.setAuthTag(payload.tag);
    const decrypted = Buffer.concat([decipher.update(payload.ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    throw new Error(
      'No fue posible descifrar secrets.enc.json. Verifica SECRET_PASSPHRASE y que el archivo cifrado no esté corrupto.',
    );
  }
};

const optionalSecret = () =>
  Joi.string()
    .allow(...OPTIONAL_EMPTY)
    .custom((value) => {
      if (typeof value !== 'string') {
        return value;
      }
      return value.length === 0 ? undefined : value;
    })
    .optional();

const secretsSchema = Joi.object({
  supabase: Joi.object({
    url: Joi.string()
      .uri({ scheme: [/https?/] })
      .required(),
    anonKey: Joi.string().min(10).required(),
    serviceRoleKey: Joi.string().min(10).required(),
  })
    .required()
    .unknown(false),
  postgres: Joi.object({
    host: Joi.string().min(1).required(),
    port: Joi.number().port().required(),
    user: Joi.string().min(1).required(),
    password: Joi.string().min(1).required(),
    database: Joi.string().min(1).required(),
  })
    .required()
    .unknown(false),
  firebase: Joi.object({
    projectId: Joi.string().min(1).required(),
    clientEmail: Joi.string().email().required(),
    privateKey: Joi.string().min(1).required(),
    databaseUrl: optionalSecret(),
    serviceAccountKey: optionalSecret(),
  })
    .required()
    .unknown(false),
  qdrant: Joi.object({
    url: Joi.string()
      .uri({ scheme: [/https?/] })
      .required(),
    apiKey: Joi.string().min(1).required(),
    collection: optionalSecret(),
    clusterId: optionalSecret(),
  })
    .optional()
    .unknown(false),
  forecasting: Joi.object({
    databaseUrl: Joi.string().min(1).required(),
    defaultModel: optionalSecret(),
    defaultHorizonDays: Joi.number().integer().min(1).optional(),
  })
    .optional()
    .unknown(false),
  jwt: Joi.object({
    secret: Joi.string().min(8).required(),
    refreshSecret: optionalSecret(),
  })
    .required()
    .unknown(false),
  integrations: Joi.object({
    openai: Joi.object({
      apiKey: Joi.string().min(10).required(),
      organizationId: optionalSecret(),
    })
      .optional()
      .unknown(false),
    email: Joi.object({
      apiKey: Joi.string().min(1).required(),
      from: optionalSecret(),
    })
      .optional()
      .unknown(false),
    storage: Joi.object({
      accessKeyId: optionalSecret(),
      secretAccessKey: optionalSecret(),
      region: optionalSecret(),
      bucket: optionalSecret(),
    })
      .optional()
      .unknown(false),
    monitoring: Joi.object({
      sentryDsn: optionalSecret(),
      mixpanelToken: optionalSecret(),
    })
      .optional()
      .unknown(false),
    stripe: Joi.object({
      publishableKey: optionalSecret(),
      secretKey: optionalSecret(),
      webhookSecret: optionalSecret(),
    })
      .optional()
      .unknown(false),
    sms: Joi.object({
      accountSid: optionalSecret(),
      authToken: optionalSecret(),
      phoneNumber: optionalSecret(),
    })
      .optional()
      .unknown(false),
  })
    .optional()
    .unknown(false),
})
  .required()
  .unknown(false);

const freezeDeep = <T>(input: T): T => {
  if (Array.isArray(input)) {
    input.forEach((item) => freezeDeep(item));
    return Object.freeze(input);
  }

  if (input && typeof input === 'object') {
    const record = input as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      record[key] = freezeDeep(record[key]);
    }
    return Object.freeze(record) as T;
  }

  return input;
};

const parseSecrets = (plaintext: string): SecretsShape => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(plaintext);
  } catch (error) {
    throw new Error('El contenido descifrado de secrets.enc.json no es JSON válido.');
  }

  const { error, value } = secretsSchema.validate(parsed, {
    abortEarly: false,
    convert: true,
    stripUnknown: true,
  });

  if (error) {
    const details = error.details.map(
      (detail) => `${detail.path.join('.') || 'root'}: ${detail.message}`,
    );
    throw new Error(`Errores al validar secrets.enc.json: ${details.join(' | ')}`);
  }

  return freezeDeep(value) as SecretsShape;
};

const getSecrets = (): SecretsShape => {
  if (!cachedSecrets) {
    const passphrase = ensurePassphrase();
    const payload = loadEncryptedPayload();
    const plaintext = decryptPayload(payload, passphrase);
    cachedSecrets = parseSecrets(plaintext);
  }
  return cachedSecrets;
};

const memoize = <T>(factory: () => T): (() => T) => {
  let hasValue = false;
  let cached: T;
  return () => {
    if (!hasValue) {
      cached = factory();
      hasValue = true;
    }
    return cached;
  };
};

export const SECRETS: SecretsAccessors = Object.freeze({
  supabase: memoize(() => getSecrets().supabase),
  postgres: memoize(() => getSecrets().postgres),
  firebase: memoize(() => getSecrets().firebase),
  qdrant: memoize(() => getSecrets().qdrant),
  forecasting: memoize(() => getSecrets().forecasting),
  jwt: memoize(() => getSecrets().jwt),
  integrations: memoize(() => getSecrets().integrations),
});

export const __testing = {
  clearCache: (): void => {
    cachedSecrets = null;
  },
};
