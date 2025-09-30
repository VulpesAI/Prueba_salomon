import { BelvoService } from './belvo.service';
import { BankConnectionService } from './bank-connection.service';
export declare class BelvoController {
    private readonly belvoService;
    private readonly bankConnectionService;
    constructor(belvoService: BelvoService, bankConnectionService: BankConnectionService);
    getInstitutions(country?: string): Promise<{
        institutions: {
            id: string;
            name: string;
            type: string;
            logo: string;
            website: string;
            primaryColor: string;
            countryCodes: string[];
        }[];
    }>;
    createConnection(req: any, body: {
        institution: string;
        username: string;
        password: string;
    }): Promise<{
        connection: {
            id: string;
            institutionName: string;
            institutionType: string;
            status: string;
            accountsCount: number;
            createdAt: Date;
            lastAccessedAt: Date;
            isHealthy: boolean;
        };
    }>;
    createWidgetToken(req: any): Promise<{
        token: string;
        refreshToken: string;
        expiresIn: number;
    }>;
    createConnectionFromWidget(req: any, body: {
        linkId?: string;
    }): Promise<{
        connection: {
            id: string;
            institutionName: string;
            institutionType: string;
            status: string;
            accountsCount: number;
            createdAt: Date;
            lastAccessedAt: Date;
            isHealthy: boolean;
        };
    }>;
    getUserConnections(req: any): Promise<{
        connections: {
            id: string;
            institutionName: string;
            institutionType: string;
            status: string;
            accountsCount: number;
            lastSyncAt: Date;
            createdAt: Date;
            isHealthy: boolean;
            needsSync: boolean;
            metadata: {
                logo: string;
                website: string;
                primaryColor: string;
            };
        }[];
    }>;
    getConnection(req: any, connectionId: string): Promise<{
        connection: {
            id: string;
            institutionName: string;
            institutionType: string;
            status: string;
            accountsCount: number;
            connectedAccounts: string[];
            lastSyncAt: Date;
            syncFrequencyHours: number;
            autoSyncEnabled: boolean;
            errorCount: number;
            lastError: string;
            createdAt: Date;
            lastAccessedAt: Date;
            isHealthy: boolean;
            needsSync: boolean;
            metadata: {
                institutionLogo?: string;
                institutionWebsite?: string;
                institutionPrimaryColor?: string;
                belvoInstitutionData?: any;
                belvoLinkStatus?: any;
                lastSyncResults?: {
                    accountsSynced: number;
                    transactionsSynced: number;
                    errors?: string[];
                };
            };
        };
    }>;
    syncConnection(req: any, connectionId: string, days: number): Promise<{
        sync: import("./bank-connection.service").SyncResult;
    }>;
    checkConnectionStatus(req: any, connectionId: string): Promise<{
        status: {
            id: string;
            status: string;
            isHealthy: boolean;
            lastAccessedAt: Date;
            errorCount: number;
            lastError: string;
        };
    }>;
    deleteConnection(req: any, connectionId: string): Promise<void>;
    syncAllConnections(req: any): Promise<{
        syncResults: import("./bank-connection.service").SyncResult[];
        summary: {
            totalConnections: number;
            successfulSyncs: number;
            totalTransactionsSynced: number;
            totalErrors: number;
        };
    }>;
    getConnectionStats(req: any): Promise<{
        stats: {
            totalConnections: number;
            activeConnections: number;
            totalAccounts: number;
            lastSyncDate: Date | null;
            healthyConnections: number;
        };
    }>;
    getConnectionAccounts(req: any, connectionId: string): Promise<{
        accounts: {
            id: string;
            name: string;
            number: string;
            type: string;
            category: string;
            currency: string;
            balance: {
                current: number;
                available: number;
            };
            lastAccessedAt: string;
            bankProductId: string;
            publicIdentification: {
                name: string;
                value: string;
            };
        }[];
    }>;
    getConnectionBalances(req: any, connectionId: string): Promise<{
        balances: {
            account: any;
            current: any;
            available: any;
            currency: any;
            collectedAt: any;
        }[];
    }>;
}
