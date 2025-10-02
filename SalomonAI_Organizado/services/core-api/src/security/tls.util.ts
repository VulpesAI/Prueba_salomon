import { Logger } from '@nestjs/common';
import { HttpsOptions } from '@nestjs/common/interfaces/external/https-options.interface';
import axios from 'axios';

const logger = new Logger('TLSBootstrap');

const decodeBase64 = (value: string) => Buffer.from(value, 'base64').toString('utf8');

const decryptWithKms = async (ciphertext: string): Promise<string> => {
  const endpoint = process.env.KMS_ENDPOINT;
  if (!endpoint) {
    return decodeBase64(ciphertext);
  }

  try {
    const response = await axios.post(
      `${endpoint.replace(/\/$/, '')}/decrypt`,
      { ciphertext },
      {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.KMS_API_KEY ?? '',
        },
      },
    );
    if (response.data?.plaintext) {
      return response.data.plaintext as string;
    }
  } catch (error) {
    logger.warn(`Fallo al obtener certificados desde KMS: ${error}`);
  }

  return decodeBase64(ciphertext);
};

const resolveSecret = async (name: string): Promise<string | undefined> => {
  const plainValue = process.env[name];
  if (plainValue) {
    return plainValue;
  }

  const cipherValue = process.env[`${name}_CIPHERTEXT`];
  if (!cipherValue) {
    return undefined;
  }

  return decryptWithKms(cipherValue);
};

const CLOUD_RUN_ENV_MARKERS = ['K_SERVICE', 'GOOGLE_CLOUD_PROJECT', 'K_REVISION', 'K_CONFIGURATION'];

export const loadTlsOptionsFromEnv = async (): Promise<HttpsOptions | undefined> => {
  const isManagedTlsEnvironment = CLOUD_RUN_ENV_MARKERS.some(
    (marker) => !!process.env[marker],
  );

  if (isManagedTlsEnvironment) {
    logger.warn(
      'Se detectó Cloud Run/App Hosting. El balanceador termina TLS antes del contenedor; se ignorará ENABLE_TLS.',
    );
    return undefined;
  }

  if ((process.env.ENABLE_TLS ?? 'false').toLowerCase() !== 'true') {
    return undefined;
  }

  const [cert, key] = await Promise.all([
    resolveSecret('TLS_CERT_PEM'),
    resolveSecret('TLS_KEY_PEM'),
  ]);

  if (!cert || !key) {
    logger.warn('TLS habilitado pero certificados no disponibles. Se usará HTTP.');
    return undefined;
  }

  const options: HttpsOptions = {
    cert,
    key,
    requestCert: false,
  };

  (options as Record<string, unknown>).minVersion = 'TLSv1.3';

  return options;
};

