import { TransactionCategory } from '../../transactions/enums/transaction-category.enum';
export declare class ClassifyTransactionDto {
    readonly description: string;
    readonly amount?: number;
    readonly context?: string;
}
export declare class TrainTransactionDto {
    readonly text: string;
    readonly category: TransactionCategory;
    readonly amount?: number;
    readonly confidence?: number;
}
export declare class CorrectClassificationDto {
    readonly description: string;
    readonly correctCategory: TransactionCategory;
    readonly incorrectCategory?: TransactionCategory;
    readonly notes?: string;
}
export declare class ClassificationResultDto {
    readonly category: TransactionCategory;
    readonly confidence: number;
    readonly keywords: string[];
    readonly alternatives?: Array<{
        category: TransactionCategory;
        confidence: number;
    }>;
    readonly metadata?: {
        processingTime?: number;
        modelVersion?: string;
        tokensProcessed?: number;
        [key: string]: any;
    };
}
