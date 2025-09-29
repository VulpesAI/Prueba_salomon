import { createHmac, randomBytes } from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const BASE32_LOOKUP: Record<string, number> = BASE32_ALPHABET.split('').reduce(
  (acc, char, index) => ({ ...acc, [char]: index }),
  {},
);

const DEFAULT_TIME_STEP = 30;

const sanitizeToken = (token: string) => token.replace(/\s|-/g, '');

export const generateBase32Secret = (length = 20): string => {
  const buffer = randomBytes(length);
  let bits = '';
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, '0');
  }

  let secret = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.substring(i, i + 5);
    if (chunk.length < 5) {
      secret += BASE32_ALPHABET[parseInt(chunk.padEnd(5, '0'), 2)];
    } else {
      secret += BASE32_ALPHABET[parseInt(chunk, 2)];
    }
  }

  return secret;
};

const base32ToBuffer = (secret: string): Buffer => {
  const upperSecret = secret.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const char of upperSecret) {
    const value = BASE32_LOOKUP[char];
    if (value === undefined) {
      throw new Error(`Invalid base32 character: ${char}`);
    }
    bits += value.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }

  return Buffer.from(bytes);
};

const bufferToBase32 = (buffer: Buffer): string => {
  let bits = '';
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, '0');
  }

  let output = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.substring(i, i + 5);
    if (chunk.length < 5) {
      output += BASE32_ALPHABET[parseInt(chunk.padEnd(5, '0'), 2)];
    } else {
      output += BASE32_ALPHABET[parseInt(chunk, 2)];
    }
  }

  return output;
};

const generateHotp = (secret: Buffer, counter: number): string => {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = createHmac('sha1', secret);
  hmac.update(counterBuffer);
  const digest = hmac.digest();

  const offset = digest[digest.length - 1] & 0x0f;
  const code =
    ((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).toString().padStart(6, '0');

  return code;
};

export const generateTotpToken = (
  secret: string,
  timestamp: number = Date.now(),
  window: number = 0,
): string => {
  const counter = Math.floor(timestamp / 1000 / DEFAULT_TIME_STEP) + window;
  const secretBuffer = base32ToBuffer(secret);
  return generateHotp(secretBuffer, counter);
};

export const verifyTotpToken = (
  token: string,
  secret: string,
  allowedWindow = 1,
  timestamp: number = Date.now(),
): boolean => {
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

export const createOtpAuthUrl = (options: {
  label: string;
  secret: string;
  issuer?: string;
}): string => {
  const params = new URLSearchParams({ secret: options.secret });
  if (options.issuer) {
    params.append('issuer', options.issuer);
  }
  params.append('period', DEFAULT_TIME_STEP.toString());

  return `otpauth://totp/${encodeURIComponent(options.label)}?${params.toString()}`;
};

export const generateBackupCodes = (count = 10): string[] => {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const segment = bufferToBase32(randomBytes(5)).slice(0, 8);
    codes.push(segment.match(/.{1,4}/g)?.join('-') ?? segment);
  }
  return codes;
};

export const normalizeMfaToken = (token?: string | null): string | undefined => {
  if (!token) {
    return undefined;
  }
  return sanitizeToken(token).trim();
};

