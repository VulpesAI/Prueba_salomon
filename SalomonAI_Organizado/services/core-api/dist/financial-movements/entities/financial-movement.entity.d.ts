import { User } from '../../users/entities/user.entity';
export declare class FinancialMovement {
    id: string;
    description: string;
    amount: number;
    currency: string;
    transactionDate: Date;
    category: string;
    embedding: number[];
    classificationConfidence?: number;
    classificationModelVersion?: string;
    classificationReviewedAt?: Date;
    classificationMetadata?: Record<string, any>;
    user: User;
    createdAt: Date;
    updatedAt: Date;
}
