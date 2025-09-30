import { Transaction } from '../../transactions/entities/transaction.entity';
import { ForecastSummary } from '../../financial-forecasts/financial-forecasts.service';
export interface TransactionCreatedEvent {
    userId: string;
    transaction: Transaction;
}
export interface MetricsUpdatedEvent {
    userId: string;
    category: string;
    summary?: ForecastSummary | Record<string, any>;
    metrics?: Record<string, any>;
}
