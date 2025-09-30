export declare const generateBase32Secret: (length?: number) => string;
export declare const generateTotpToken: (secret: string, timestamp?: number, window?: number) => string;
export declare const verifyTotpToken: (token: string, secret: string, allowedWindow?: number, timestamp?: number) => boolean;
export declare const createOtpAuthUrl: (options: {
    label: string;
    secret: string;
    issuer?: string;
}) => string;
export declare const generateBackupCodes: (count?: number) => string[];
export declare const normalizeMfaToken: (token?: string | null) => string | undefined;
