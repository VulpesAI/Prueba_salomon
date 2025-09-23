import { User } from '../../users/entities/user.entity';
import { FinancialAccount } from './financial-account.entity';
export declare class Transaction {
    id: string;
    amount: number;
    description: string;
    category: string;
    date: Date;
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
    userId: string;
    user: User;
    accountId: string;
    account: FinancialAccount;
    metadata: Record<string, any>;
    externalId: string;
    status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    createdAt: Date;
    updatedAt: Date;
}
