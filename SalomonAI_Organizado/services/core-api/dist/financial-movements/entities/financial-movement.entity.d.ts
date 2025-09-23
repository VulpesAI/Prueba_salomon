import { User } from '../../users/entities/user.entity';
export declare class FinancialMovement {
    id: string;
    description: string;
    amount: number;
    currency: string;
    transactionDate: Date;
    category: string;
    embedding: number[];
    user: User;
    createdAt: Date;
    updatedAt: Date;
}
