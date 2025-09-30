export declare class ConsentLog {
    id: string;
    userId: string;
    consentType: string;
    granted: boolean;
    version?: string | null;
    channel?: string | null;
    metadata?: Record<string, any> | null;
    revokedAt?: Date | null;
    recordedAt: Date;
    updatedAt: Date;
}
