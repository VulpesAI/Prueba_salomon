"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadTlsOptionsFromEnv = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const logger = new common_1.Logger('TLSBootstrap');
const decodeBase64 = (value) => Buffer.from(value, 'base64').toString('utf8');
const decryptWithKms = async (ciphertext) => {
    const endpoint = process.env.KMS_ENDPOINT;
    if (!endpoint) {
        return decodeBase64(ciphertext);
    }
    try {
        const response = await axios_1.default.post(`${endpoint.replace(/\/$/, '')}/decrypt`, { ciphertext }, {
            timeout: 5000,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.KMS_API_KEY ?? '',
            },
        });
        if (response.data?.plaintext) {
            return response.data.plaintext;
        }
    }
    catch (error) {
        logger.warn(`Fallo al obtener certificados desde KMS: ${error}`);
    }
    return decodeBase64(ciphertext);
};
const resolveSecret = async (name) => {
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
const loadTlsOptionsFromEnv = async () => {
    const isManagedTlsEnvironment = CLOUD_RUN_ENV_MARKERS.some((marker) => !!process.env[marker]);
    if (isManagedTlsEnvironment) {
        logger.warn('Se detectó Cloud Run/App Hosting. El balanceador termina TLS antes del contenedor; se ignorará ENABLE_TLS.');
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
    const options = {
        cert,
        key,
        requestCert: false,
    };
    options.minVersion = 'TLSv1.3';
    return options;
};
exports.loadTlsOptionsFromEnv = loadTlsOptionsFromEnv;
//# sourceMappingURL=tls.util.js.map