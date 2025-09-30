export declare class LogConsentDto {
    userId?: string;
    consentType: string;
    granted?: boolean;
    channel?: string;
    version?: string;
    metadata?: Record<string, any>;
    requestedBy?: string;
}
