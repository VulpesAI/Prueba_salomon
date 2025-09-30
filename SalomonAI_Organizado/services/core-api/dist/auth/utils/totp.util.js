"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeMfaToken = exports.generateBackupCodes = exports.createOtpAuthUrl = exports.verifyTotpToken = exports.generateTotpToken = exports.generateBase32Secret = void 0;
const crypto_1 = require("crypto");
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const BASE32_LOOKUP = BASE32_ALPHABET.split('').reduce((acc, char, index) => ({ ...acc, [char]: index }), {});
const DEFAULT_TIME_STEP = 30;
const sanitizeToken = (token) => token.replace(/\s|-/g, '');
const generateBase32Secret = (length = 20) => {
    const buffer = (0, crypto_1.randomBytes)(length);
    let bits = '';
    for (const byte of buffer) {
        bits += byte.toString(2).padStart(8, '0');
    }
    let secret = '';
    for (let i = 0; i < bits.length; i += 5) {
        const chunk = bits.substring(i, i + 5);
        if (chunk.length < 5) {
            secret += BASE32_ALPHABET[parseInt(chunk.padEnd(5, '0'), 2)];
        }
        else {
            secret += BASE32_ALPHABET[parseInt(chunk, 2)];
        }
    }
    return secret;
};
exports.generateBase32Secret = generateBase32Secret;
const base32ToBuffer = (secret) => {
    const upperSecret = secret.toUpperCase().replace(/[^A-Z2-7]/g, '');
    let bits = '';
    for (const char of upperSecret) {
        const value = BASE32_LOOKUP[char];
        if (value === undefined) {
            throw new Error(`Invalid base32 character: ${char}`);
        }
        bits += value.toString(2).padStart(5, '0');
    }
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(parseInt(bits.substring(i, i + 8), 2));
    }
    return Buffer.from(bytes);
};
const bufferToBase32 = (buffer) => {
    let bits = '';
    for (const byte of buffer) {
        bits += byte.toString(2).padStart(8, '0');
    }
    let output = '';
    for (let i = 0; i < bits.length; i += 5) {
        const chunk = bits.substring(i, i + 5);
        if (chunk.length < 5) {
            output += BASE32_ALPHABET[parseInt(chunk.padEnd(5, '0'), 2)];
        }
        else {
            output += BASE32_ALPHABET[parseInt(chunk, 2)];
        }
    }
    return output;
};
const generateHotp = (secret, counter) => {
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigUInt64BE(BigInt(counter));
    const hmac = (0, crypto_1.createHmac)('sha1', secret);
    hmac.update(counterBuffer);
    const digest = hmac.digest();
    const offset = digest[digest.length - 1] & 0x0f;
    const code = ((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).toString().padStart(6, '0');
    return code;
};
const generateTotpToken = (secret, timestamp = Date.now(), window = 0) => {
    const counter = Math.floor(timestamp / 1000 / DEFAULT_TIME_STEP) + window;
    const secretBuffer = base32ToBuffer(secret);
    return generateHotp(secretBuffer, counter);
};
exports.generateTotpToken = generateTotpToken;
const verifyTotpToken = (token, secret, allowedWindow = 1, timestamp = Date.now()) => {
    if (!token || !secret) {
        return false;
    }
    const sanitized = sanitizeToken(token);
    if (sanitized.length < 6 || sanitized.length > 10) {
        return false;
    }
    const counter = Math.floor(timestamp / 1000 / DEFAULT_TIME_STEP);
    const secretBuffer = base32ToBuffer(secret);
    for (let errorWindow = -allowedWindow; errorWindow <= allowedWindow; errorWindow++) {
        const candidate = generateHotp(secretBuffer, counter + errorWindow);
        if (candidate === sanitized) {
            return true;
        }
    }
    return false;
};
exports.verifyTotpToken = verifyTotpToken;
const createOtpAuthUrl = (options) => {
    const params = new URLSearchParams({ secret: options.secret });
    if (options.issuer) {
        params.append('issuer', options.issuer);
    }
    params.append('period', DEFAULT_TIME_STEP.toString());
    return `otpauth://totp/${encodeURIComponent(options.label)}?${params.toString()}`;
};
exports.createOtpAuthUrl = createOtpAuthUrl;
const generateBackupCodes = (count = 10) => {
    const codes = [];
    for (let i = 0; i < count; i++) {
        const segment = bufferToBase32((0, crypto_1.randomBytes)(5)).slice(0, 8);
        codes.push(segment.match(/.{1,4}/g)?.join('-') ?? segment);
    }
    return codes;
};
exports.generateBackupCodes = generateBackupCodes;
const normalizeMfaToken = (token) => {
    if (!token) {
        return undefined;
    }
    return sanitizeToken(token).trim();
};
exports.normalizeMfaToken = normalizeMfaToken;
//# sourceMappingURL=totp.util.js.map