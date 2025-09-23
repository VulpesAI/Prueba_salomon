import { Repository } from 'typeorm';
import { BankConnection } from './entities/bank-connection.entity';
import { BelvoService } from './belvo.service';
import { FinancialMovementsService } from '../financial-movements/financial-movements.service';
export interface CreateBankConnectionDto {
    userId: string;
    institution: string;
    username: string;
    password: string;
}
export interface SyncResult {
    success: boolean;
    accountsSynced: number;
    transactionsSynced: number;
    errors: string[];
}
export declare class BankConnectionService {
    private readonly bankConnectionRepository;
    private readonly belvoService;
    private readonly financialMovementsService;
    constructor(bankConnectionRepository: Repository<BankConnection>, belvoService: BelvoService, financialMovementsService: FinancialMovementsService);
    createConnection(dto: CreateBankConnectionDto): Promise<BankConnection>;
    getUserConnections(userId: string): Promise<BankConnection[]>;
    getConnection(connectionId: string, userId: string): Promise<BankConnection>;
    syncAccounts(connectionId: string): Promise<void>;
    syncTransactions(connectionId: string, days?: number): Promise<SyncResult>;
    deleteConnection(connectionId: string, userId: string): Promise<void>;
    checkConnectionStatus(connectionId: string): Promise<BankConnection>;
    getConnectionsNeedingSync(): Promise<BankConnection[]>;
    syncUserConnections(userId: string): Promise<SyncResult[]>;
    getUserConnectionStats(userId: string): Promise<{
        totalConnections: number;
        activeConnections: number;
        totalAccounts: number;
        lastSyncDate: Date | null;
        healthyConnections: number;
    }>;
}
