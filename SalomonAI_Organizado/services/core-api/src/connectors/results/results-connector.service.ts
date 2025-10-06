import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, KafkaMessage, Producer, logLevel } from 'kafkajs';

import { SupabaseService, ParsedStatementResultPayload } from '../../auth/supabase.service';
import { ForecastingOrchestratorService } from '../../recommendations/forecasting-orchestrator.service';
import { RecommendationsIngestionService } from '../../recommendations/recommendations-ingestion.service';
import type { ResultsMessagingConfig } from '../../config/configuration';

@Injectable()
export class ResultsConnectorService implements OnModuleDestroy {
  private readonly logger = new Logger(ResultsConnectorService.name);
  private readonly brokers: string[] = [];
  private producer: Producer | null = null;
  private producerPromise: Promise<Producer | null> | null = null;
  private dlqTopic: string | null = null;
  private maxRetries = 3;
  private retryDelayMs = 1000;

  constructor(
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
    private readonly ingestionService: RecommendationsIngestionService,
    private readonly forecastingService: ForecastingOrchestratorService,
  ) {
    const config = this.configService.get<ResultsMessagingConfig>('messaging.results', {
      infer: true,
    });

    if (!config?.enabled || config.brokers.length === 0) {
      this.logger.log('Results connector is disabled because no Kafka brokers were configured.');
      return;
    }

    this.maxRetries = Math.max(config.maxRetries ?? 3, 0);
    this.retryDelayMs = Math.max(config.retryDelayMs ?? 1000, 0);
    this.dlqTopic = config.dlqTopic ?? null;
    this.brokers = config.brokers;
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.producer) {
      return;
    }

    try {
      await this.producer.disconnect();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown';
      this.logger.error(`Failed to disconnect results DLQ producer: ${message}`);
    } finally {
      this.producer = null;
    }
  }

  async handleKafkaMessage(topic: string, message: KafkaMessage, payload: unknown): Promise<void> {
    if (!message.value) {
      this.logger.warn('Received Kafka message without value for parsed statement connector.');
      return;
    }

    try {
      const rawPayload = this.extractPayload(payload, message);
      const normalized = this.normalizePayload(rawPayload);
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

  private extractPayload(payload: unknown, message: KafkaMessage): Record<string, unknown> {
    if (this.isRecord(payload)) {
      return payload;
    }

    try {
      return JSON.parse(message.value?.toString() ?? '{}') as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  private async afterStatementProcessed(payload: ParsedStatementResultPayload): Promise<void> {
    const userId = payload.userId;
    if (!userId) {
      this.logger.warn(
        'Received parsed statement result without userId; skipping ingestion hooks.',
      );
      return;
    }

    await Promise.all([
      (async () => {
        try {
          await this.ingestionService.ingestUser(userId);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(
            `Failed to refresh recommendation ingestion for user ${userId}: ${message}`,
          );
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

  private normalizePayload(raw: Record<string, unknown>): ParsedStatementResultPayload {
    const statementId = this.getStringValue(raw, ['statementId', 'statement_id', 'id']) ?? '';
    const userId = this.getStringValue(raw, ['userId', 'user_id', 'owner_id']) ?? '';
    const statusRaw = this.getStringValue(raw, ['status', 'result_status']) ?? 'completed';
    const error = this.getStringValue(raw, ['error', 'error_message']);
    const processedAt = this.getStringValue(raw, ['processedAt', 'processed_at', 'completed_at']);
    const summarySource = this.toRecord(raw['summary'] ?? raw['statement'] ?? raw['meta'] ?? {});
    const transactionsSource = this.resolveTransactions(raw);

    const transactions = transactionsSource
      .map((entry, index) => this.normalizeTransaction(entry, raw, statementId, index))
      .filter(
        (entry): entry is ParsedStatementResultPayload['transactions'][number] => entry !== null,
      );

    return {
      statementId,
      userId,
      status: statusRaw.toLowerCase() === 'failed' ? 'failed' : 'completed',
      error: error ?? null,
      processedAt: processedAt ?? null,
      summary: this.normalizeSummary(summarySource),
      transactions,
    };
  }

  private normalizeSummary(raw: Record<string, unknown>) {
    return {
      openingBalance: this.getNumberValue(raw, ['openingBalance', 'opening_balance']),
      closingBalance: this.getNumberValue(raw, ['closingBalance', 'closing_balance']),
      totalCredit: this.getNumberValue(raw, ['totalCredit', 'total_credit']),
      totalDebit: this.getNumberValue(raw, ['totalDebit', 'total_debit']),
      transactionCount: this.getNumberValue(raw, ['transactionCount', 'transaction_count']),
      periodStart: this.getStringValue(raw, ['periodStart', 'period_start']),
      periodEnd: this.getStringValue(raw, ['periodEnd', 'period_end']),
      statementDate: this.getStringValue(raw, ['statementDate', 'statement_date']),
      checksum: this.getStringValue(raw, ['checksum']),
    };
  }

  private async sendToDlq(
    topic: string,
    message: KafkaMessage,
    errorMessage: string,
  ): Promise<void> {
    if (!this.dlqTopic) {
      this.logger.warn(
        `DLQ is not configured. Dropping message from topic ${topic} with error: ${errorMessage}`,
      );
      return;
    }

    const producer = await this.getDlqProducer();

    if (!producer) {
      this.logger.warn(
        `Failed to obtain DLQ producer. Dropping message from topic ${topic} with error: ${errorMessage}`,
      );
      return;
    }

    try {
      await producer.send({
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

  private async getDlqProducer(): Promise<Producer | null> {
    if (!this.dlqTopic || this.brokers.length === 0) {
      return null;
    }

    if (this.producer) {
      return this.producer;
    }

    if (this.producerPromise) {
      return this.producerPromise;
    }

    const kafka = new Kafka({
      clientId: `core-api-results-dlq-${Math.random().toString(36).slice(2, 10)}`,
      brokers: this.brokers,
      logLevel: logLevel.NOTHING,
    });

    const producer = kafka.producer();
    this.producerPromise = producer
      .connect()
      .then(() => {
        this.logger.log(`Results connector DLQ enabled on topic ${this.dlqTopic}`);
        this.producer = producer;
        return producer;
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to connect results DLQ producer: ${message}`);
        return null;
      })
      .finally(() => {
        this.producerPromise = null;
      });

    return this.producerPromise;
  }

  private resolveTransactions(raw: Record<string, unknown>): unknown[] {
    const primary = raw['transactions'];
    if (Array.isArray(primary)) {
      return primary;
    }

    const fallback = raw['items'];
    if (Array.isArray(fallback)) {
      return fallback;
    }

    return [];
  }

  private normalizeTransaction(
    entry: unknown,
    raw: Record<string, unknown>,
    statementId: string,
    index: number,
  ): ParsedStatementResultPayload['transactions'][number] | null {
    if (!this.isRecord(entry)) {
      return null;
    }

    const currency =
      this.getStringValue(entry, ['currency']) ?? this.getStringValue(raw, ['currency']);
    const metadataValue = entry['metadata'];
    const metadata = this.isRecord(metadataValue) ? metadataValue : null;

    return {
      id: this.getStringValue(entry, ['id', 'uuid']) ?? undefined,
      externalId:
        this.getStringValue(entry, ['externalId', 'external_id']) ??
        this.getStringValue(entry, ['id', 'uuid']) ??
        (statementId ? `${statementId}-${index}` : undefined),
      postedAt: this.getStringValue(entry, ['postedAt', 'posted_at']),
      description: this.getStringValue(entry, ['description']),
      rawDescription: this.getStringValue(entry, ['rawDescription', 'raw_description']),
      normalizedDescription: this.getStringValue(entry, [
        'normalizedDescription',
        'normalized_description',
      ]),
      amount: this.getNumberValue(entry, ['amount']),
      currency: currency ?? null,
      merchant: this.getStringValue(entry, ['merchant', 'vendor']),
      category: this.getStringValue(entry, ['category', 'segment']),
      status: this.getStringValue(entry, ['status']),
      metadata,
    };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private toRecord(value: unknown): Record<string, unknown> {
    return this.isRecord(value) ? value : {};
  }

  private getStringValue(source: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.length > 0) {
        return value;
      }
    }

    return null;
  }

  private getNumberValue(source: Record<string, unknown>, keys: string[]): number | null {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }

      if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) {
          return parsed;
        }
      }
    }

    return null;
  }
}
