import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, Kafka, KafkaMessage, Producer, logLevel } from 'kafkajs';

import { SupabaseService, ParsedStatementResultPayload } from '../../auth/supabase.service';
import { ForecastingOrchestratorService } from '../../recommendations/forecasting-orchestrator.service';
import { RecommendationsIngestionService } from '../../recommendations/recommendations-ingestion.service';
import type { ResultsMessagingConfig } from '../../config/configuration';

@Injectable()
export class ResultsConnectorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ResultsConnectorService.name);
  private consumer: Consumer | null = null;
  private topic: string | null = null;
  private producer: Producer | null = null;
  private dlqTopic: string | null = null;
  private maxRetries = 3;
  private retryDelayMs = 1000;

  constructor(
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
    private readonly ingestionService: RecommendationsIngestionService,
    private readonly forecastingService: ForecastingOrchestratorService,
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
    this.maxRetries = Math.max(config.maxRetries ?? 3, 0);
    this.retryDelayMs = Math.max(config.retryDelayMs ?? 1000, 0);
    this.dlqTopic = config.dlqTopic ?? null;

    if (this.dlqTopic) {
      this.producer = kafka.producer();
      await this.producer.connect();
      this.logger.log(`Results connector DLQ enabled on topic ${this.dlqTopic}`);
    }

    await this.consumer.connect();
    await this.consumer.subscribe({ topic: config.topic, fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ topic, message }) => {
        await this.handleMessage(topic, message);
      },
    });

    this.logger.log(`Results connector subscribed to topic ${config.topic}`);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([
      (async () => {
        if (!this.consumer) {
          return;
        }

        try {
          await this.consumer.disconnect();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown';
          this.logger.error(`Failed to disconnect results connector: ${message}`);
        }
      })(),
      (async () => {
        if (!this.producer) {
          return;
        }

        try {
          await this.producer.disconnect();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown';
          this.logger.error(`Failed to disconnect results DLQ producer: ${message}`);
        }
      })(),
    ]);
  }

  private async handleMessage(topic: string, message: KafkaMessage): Promise<void> {
    if (!message.value) {
      this.logger.warn('Received Kafka message without value for parsed statement connector.');
      return;
    }

    try {
      const payload = JSON.parse(message.value.toString());
      const normalized = this.normalizePayload(payload);
      await this.processMessageWithRetry(topic, message, normalized);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process parsed statement message: ${messageText}`);
      await this.sendToDlq(topic, message, messageText);
    }
  }

  private async processMessageWithRetry(
    topic: string,
    message: KafkaMessage,
    payload: ParsedStatementResultPayload,
  ): Promise<void> {
    let attempt = 0;
    const attemptsLimit = this.maxRetries;

    while (attempt <= attemptsLimit) {
      try {
        await this.supabaseService.applyParsedStatementResult(payload);
        await this.afterStatementProcessed(payload);
        return;
      } catch (error) {
        attempt += 1;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (attempt > attemptsLimit) {
          this.logger.error(
            `Failed to persist parsed statement ${payload.statementId} after ${attemptsLimit} retries: ${errorMessage}`,
          );
          await this.sendToDlq(topic, message, errorMessage);
          return;
        }

        this.logger.warn(
          `Retry ${attempt} for parsed statement ${payload.statementId} due to error: ${errorMessage}`,
        );

        if (this.retryDelayMs > 0) {
          await this.delay(this.retryDelayMs);
        }
      }
    }
  }

  private async afterStatementProcessed(payload: ParsedStatementResultPayload): Promise<void> {
    const userId = payload.userId;
    if (!userId) {
      this.logger.warn('Received parsed statement result without userId; skipping ingestion hooks.');
      return;
    }

    await Promise.all([
      (async () => {
        try {
          await this.ingestionService.ingestUser(userId);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(`Failed to refresh recommendation ingestion for user ${userId}: ${message}`);
        }
      })(),
      (async () => {
        try {
          await this.forecastingService.generateForecast(userId);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(`Failed to trigger forecasting for user ${userId}: ${message}`);
        }
      })(),
    ]);
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

  private async sendToDlq(topic: string, message: KafkaMessage, errorMessage: string): Promise<void> {
    if (!this.producer || !this.dlqTopic) {
      this.logger.warn(
        `DLQ is not configured. Dropping message from topic ${topic} with error: ${errorMessage}`,
      );
      return;
    }

    try {
      await this.producer.send({
        topic: this.dlqTopic,
        messages: [
          {
            value: message.value,
            headers: {
              'x-error': Buffer.from(errorMessage, 'utf-8'),
              'x-source-topic': Buffer.from(topic, 'utf-8'),
            },
          },
        ],
      });
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to publish message to DLQ: ${messageText}`);
    }
  }

  private async delay(ms: number): Promise<void> {
    if (ms <= 0) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
