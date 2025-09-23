import { User } from '../../users/entities/user.entity';
import { Transaction } from './transaction.entity';
export declare class FinancialAccount {
    id: string;
    name: string;
    type: 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'INVESTMENT' | 'OTHER';
    balance: number;
    currency: string;
    userId: string;
    user: User;
    transactions: Transaction[];
    externalId: string;
    provider: string;
    metadata: Record<string, any>;
    status: 'ACTIVE' | 'INACTIVE' | 'DELETED';
    lastSynced: Date;
    createdAt: Date;
    updatedAt: Date;
}
