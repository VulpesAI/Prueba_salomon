#!/usr/bin/env ts-node
import { createCipheriv, randomBytes, scryptSync } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

interface EncryptedPayload {
  version: number;
  algorithm: 'aes-256-gcm';
  salt: string;
  iv: string;
  tag: string;
  ciphertext: string;
  createdAt: string;
}

const LOCAL_FILE_NAME = 'secrets.local.json';
const ENCRYPTED_FILE_NAME = 'secrets.enc.json';
const SECRETS_DIR = path.resolve(__dirname, '..', 'secrets');

const ensurePassphrase = (): string => {
  const passphrase = process.env.SECRET_PASSPHRASE;
  if (typeof passphrase !== 'string' || passphrase.trim().length === 0) {
    throw new Error('SECRET_PASSPHRASE no está definido. Exporta la frase de paso antes de ejecutar el script.');
  }

  if (passphrase.length < 12) {
    throw new Error('SECRET_PASSPHRASE debe tener al menos 12 caracteres para derivar una clave segura.');
  }

  return passphrase;
};

const loadLocalSecrets = (filePath: string): string => {
  if (!existsSync(filePath)) {
    throw new Error(
      `No se encontró "${LOCAL_FILE_NAME}" en ${filePath}. Crea el archivo a partir de secrets.template.json y completa los valores reales.`,
    );
  }

  try {
    const raw = readFileSync(filePath, 'utf8');
    // Validamos que el JSON sea correcto antes de cifrarlo
    const parsed = JSON.parse(raw);
    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('El archivo secrets.local.json contiene JSON inválido. Revisa la sintaxis antes de continuar.');
    }
    throw error;
  }
};

const encryptSecrets = (passphrase: string, plaintext: string): EncryptedPayload => {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = scryptSync(passphrase, salt, 32);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    version: 1,
    algorithm: 'aes-256-gcm',
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    createdAt: new Date().toISOString(),
  };
};

const writeEncryptedFile = (filePath: string, payload: EncryptedPayload): void => {
  const directory = path.dirname(filePath);
  mkdirSync(directory, { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 });
};

const main = (): void => {
  try {
    const passphrase = ensurePassphrase();
    const localPath = path.join(SECRETS_DIR, LOCAL_FILE_NAME);
    const encryptedPath = path.join(SECRETS_DIR, ENCRYPTED_FILE_NAME);

    const normalizedSecrets = loadLocalSecrets(localPath);
    const payload = encryptSecrets(passphrase, normalizedSecrets);
    writeEncryptedFile(encryptedPath, payload);

    console.log(`✅ Se generó ${ENCRYPTED_FILE_NAME} correctamente.`);
    console.log(`   Ruta: ${encryptedPath}`);
    console.log('   Sube este archivo al control de versiones y distribuye secrets.local.json mediante un gestor seguro.');
  } catch (error) {
    console.error('❌ No se pudo sellar el archivo de secretos.');
    if (error instanceof Error) {
      console.error(`   Motivo: ${error.message}`);
    } else {
      console.error('   Motivo desconocido.');
    }
    process.exitCode = 1;
  }
};

main();
