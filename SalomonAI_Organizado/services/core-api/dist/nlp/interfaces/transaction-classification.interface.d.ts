import { TransactionCategory } from '../../transactions/enums/transaction-category.enum';
export interface TransactionClassification {
    category: TransactionCategory;
    confidence: number;
    keywords: string[];
}
export interface TransactionClassificationResult {
    classification: TransactionClassification;
    embedding: number[];
    normalizedText: string;
}
