import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, Kafka, KafkaMessage, logLevel } from 'kafkajs';

import { SupabaseService, ParsedStatementResultPayload } from '../../auth/supabase.service';
import type { ResultsMessagingConfig } from '../../config/configuration';

@Injectable()
export class ResultsConnectorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ResultsConnectorService.name);
  private consumer: Consumer | null = null;
  private topic: string | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async onModuleInit(): Promise<void> {
    const config = this.configService.get<ResultsMessagingConfig>('messaging.results', {
      infer: true,
    });

    if (!config?.enabled || config.brokers.length === 0) {
      this.logger.log('Results connector is disabled because no Kafka brokers were configured.');
      return;
    }

    const kafka = new Kafka({
      clientId: `core-api-results-${Math.random().toString(36).slice(2, 10)}`,
      brokers: config.brokers,
      logLevel: logLevel.NOTHING,
    });

    this.consumer = kafka.consumer({ groupId: config.groupId });
    this.topic = config.topic;

    await this.consumer.connect();
    await this.consumer.subscribe({ topic: config.topic, fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        await this.handleMessage(message);
      },
    });

    this.logger.log(`Results connector subscribed to topic ${config.topic}`);
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.consumer) {
      return;
    }

    try {
      await this.consumer.disconnect();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown';
      this.logger.error(`Failed to disconnect results connector: ${message}`);
    }
  }

  private async handleMessage(message: KafkaMessage): Promise<void> {
    if (!message.value) {
      this.logger.warn('Received Kafka message without value for parsed statement connector.');
      return;
    }

    try {
      const payload = JSON.parse(message.value.toString());
      const normalized = this.normalizePayload(payload);
      await this.supabaseService.applyParsedStatementResult(normalized);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process parsed statement message: ${messageText}`);
    }
  }

  private normalizePayload(raw: Record<string, any>): ParsedStatementResultPayload {
    const transactions: ParsedStatementResultPayload['transactions'] = Array.isArray(raw.transactions)
      ? raw.transactions
      : Array.isArray(raw.items)
      ? raw.items
      : [];

    return {
      statementId: raw.statementId ?? raw.statement_id ?? raw.id,
      userId: raw.userId ?? raw.user_id ?? raw.owner_id ?? '',
      status: (raw.status ?? raw.result_status ?? 'completed').toLowerCase() === 'failed'
        ? 'failed'
        : 'completed',
      error: raw.error ?? raw.error_message ?? null,
      processedAt: raw.processedAt ?? raw.processed_at ?? raw.completed_at ?? null,
      summary: this.normalizeSummary(raw.summary ?? raw.statement ?? raw.meta ?? {}),
      transactions: transactions.map((transaction: Record<string, any>, index: number) => ({
        id: transaction.id ?? transaction.uuid ?? undefined,
        externalId: transaction.externalId ?? transaction.external_id ?? undefined,
        postedAt: transaction.postedAt ?? transaction.posted_at ?? null,
        description: transaction.description ?? null,
        rawDescription: transaction.rawDescription ?? transaction.raw_description ?? null,
        normalizedDescription:
          transaction.normalizedDescription ?? transaction.normalized_description ?? null,
        amount: transaction.amount ?? null,
        currency: transaction.currency ?? raw.currency ?? null,
        merchant: transaction.merchant ?? transaction.vendor ?? null,
        category: transaction.category ?? transaction.segment ?? null,
        status: transaction.status ?? null,
        metadata: transaction.metadata ?? null,
      })),
    };
  }

  private normalizeSummary(raw: Record<string, any>) {
    return {
      openingBalance: raw.openingBalance ?? raw.opening_balance ?? null,
      closingBalance: raw.closingBalance ?? raw.closing_balance ?? null,
      totalCredit: raw.totalCredit ?? raw.total_credit ?? null,
      totalDebit: raw.totalDebit ?? raw.total_debit ?? null,
      transactionCount: raw.transactionCount ?? raw.transaction_count ?? null,
      periodStart: raw.periodStart ?? raw.period_start ?? null,
      periodEnd: raw.periodEnd ?? raw.period_end ?? null,
      statementDate: raw.statementDate ?? raw.statement_date ?? null,
      checksum: raw.checksum ?? null,
    };
  }
}
