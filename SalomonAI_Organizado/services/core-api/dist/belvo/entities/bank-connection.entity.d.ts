export declare class BankConnection {
    id: string;
    belvoLinkId: string;
    institutionName: string;
    institutionId: string;
    institutionType: string;
    accessMode: string;
    status: string;
    lastAccessedAt: Date;
    accountsCount: number;
    lastSyncAt: Date;
    syncFrequencyHours: number;
    autoSyncEnabled: boolean;
    metadata: {
        institutionLogo?: string;
        institutionWebsite?: string;
        institutionPrimaryColor?: string;
        belvoInstitutionData?: any;
        lastSyncResults?: {
            accountsSynced: number;
            transactionsSynced: number;
            errors?: string[];
        };
    };
    connectedAccounts: string[];
    isActive: boolean;
    errorCount: number;
    lastError: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    get isHealthy(): boolean;
    get needsSync(): boolean;
    incrementErrorCount(error: string): void;
    resetErrorCount(): void;
    updateSyncResults(accountsSynced: number, transactionsSynced: number, errors?: string[]): void;
}
