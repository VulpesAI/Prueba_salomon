import { Repository } from 'typeorm';
import { Transaction } from './entities/transaction.entity';
import { FinancialAccount } from './entities/financial-account.entity';
import { ClassificationService } from '../classification/classification.service';
interface CreateTransactionDto {
    amount: number;
    description: string;
    date: Date;
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
    accountId: string;
    userId: string;
    metadata?: Record<string, any>;
    externalId?: string;
}
interface UpdateTransactionDto {
    amount?: number;
    description?: string;
    category?: string;
    date?: Date;
    type?: 'INCOME' | 'EXPENSE' | 'TRANSFER';
    metadata?: Record<string, any>;
    status?: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
}
interface TransactionFilters {
    startDate?: Date;
    endDate?: Date;
    type?: 'INCOME' | 'EXPENSE' | 'TRANSFER';
    category?: string;
    accountId?: string;
    status?: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
}
export declare class TransactionsService {
    private transactionRepository;
    private accountRepository;
    private classificationService;
    constructor(transactionRepository: Repository<Transaction>, accountRepository: Repository<FinancialAccount>, classificationService: ClassificationService);
    create(createTransactionDto: CreateTransactionDto): Promise<Transaction>;
    findAll(userId: string, filters?: TransactionFilters): Promise<Transaction[]>;
    update(id: string, userId: string, updateTransactionDto: UpdateTransactionDto): Promise<Transaction>;
    remove(id: string, userId: string): Promise<void>;
    getStatistics(userId: string, startDate: Date, endDate: Date): Promise<{
        totalIncome: number;
        totalExpense: number;
        byCategory: Record<string, number>;
    }>;
}
export {};
