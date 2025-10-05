import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SupabaseService, SupabaseUserTransactionRecord } from '../auth/supabase.service';
import type { RecommendationsConfig } from '../config/configuration';

export interface CategorizedMovement {
  id: string;
  userId: string;
  user_id: string;
  statementId: string;
  accountId: string | null;
  amount: number | null;
  category: string;
  description: string | null;
  merchant: string | null;
  timestamp: string | null;
  transaction_date: string | null;
  metadata: Record<string, unknown> | null;
}

export interface IngestionStatus {
  trackedUsers: number;
  lastRunAt: string | null;
  lastRefreshByUser: Record<string, string>;
}

@Injectable()
export class RecommendationsIngestionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RecommendationsIngestionService.name);
  private readonly trackedUsers = new Set<string>();
  private readonly transactions = new Map<string, CategorizedMovement[]>();
  private readonly lastRefreshByUser = new Map<string, Date>();
  private readonly intervalMs: number;
  private intervalHandle: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastRunAt: Date | null = null;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {
    const config = this.configService.get<RecommendationsConfig>('recommendations', {
      infer: true,
    });
    const fallbackInterval = 5 * 60 * 1000; // 5 minutes
    this.intervalMs = Math.max(config?.ingestionIntervalMs ?? fallbackInterval, 0);
  }

  onModuleInit(): void {
    if (this.intervalMs > 0) {
      this.intervalHandle = setInterval(() => {
        void this.runScheduledIngestion();
      }, this.intervalMs);
    }
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  async ingestUser(userId: string): Promise<void> {
    if (!userId.trim()) {
      return;
    }

    this.trackedUsers.add(userId);
    await this.refreshUserTransactions(userId);
  }

  getAllTransactions(): CategorizedMovement[] {
    return Array.from(this.transactions.values()).flat();
  }

  getStatus(): IngestionStatus {
    const formatDate = (value: Date | null | undefined): string | null =>
      value ? value.toISOString() : null;

    const lastRefresh: Record<string, string> = {};
    this.lastRefreshByUser.forEach((date, userId) => {
      lastRefresh[userId] = date.toISOString();
    });

    return {
      trackedUsers: this.trackedUsers.size,
      lastRunAt: formatDate(this.lastRunAt),
      lastRefreshByUser: lastRefresh,
    };
  }

  private async runScheduledIngestion(): Promise<void> {
    if (this.isRunning || this.trackedUsers.size === 0) {
      return;
    }

    this.isRunning = true;
    try {
      for (const userId of this.trackedUsers) {
        await this.refreshUserTransactions(userId);
      }
      this.lastRunAt = new Date();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Scheduled ingestion failed: ${message}`);
    } finally {
      this.isRunning = false;
    }
  }

  private async refreshUserTransactions(userId: string): Promise<void> {
    if (!this.supabaseService.isEnabled()) {
      this.logger.warn('Supabase is not configured; skipping ingestion refresh.');
      return;
    }

    try {
      const transactions = await this.supabaseService.listUserTransactions(userId);
      const normalized = transactions.map((transaction) =>
        this.normalizeTransaction(transaction),
      );
      this.transactions.set(userId, normalized);
      this.lastRefreshByUser.set(userId, new Date());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to refresh transactions for user ${userId}: ${message}`);
    }
  }

  private normalizeTransaction(transaction: SupabaseUserTransactionRecord): CategorizedMovement {
    const statement = transaction.statement;
    const account = transaction.account;
    const userId = statement?.user_id ?? 'unknown';
    const timestamp = transaction.posted_at ?? statement?.statement_date ?? statement?.period_end ?? null;
    const category = (transaction.category ?? 'otros').toLowerCase();
    const description =
      transaction.description ??
      transaction.normalized_description ??
      transaction.raw_description ??
      null;

    return {
      id: transaction.id,
      userId,
      user_id: userId,
      statementId: transaction.statement_id,
      accountId: account?.id ?? statement?.account_id ?? null,
      amount: transaction.amount ?? null,
      category,
      description,
      merchant: transaction.merchant ?? null,
      timestamp,
      transaction_date: timestamp,
      metadata: {
        currency: transaction.currency ?? account?.currency ?? null,
        statementPeriod: {
          start: statement?.period_start ?? null,
          end: statement?.period_end ?? null,
        },
        source: 'supabase',
      },
    };
  }
}
