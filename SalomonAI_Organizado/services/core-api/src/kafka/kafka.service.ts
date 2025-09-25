import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, ProducerRecord } from 'kafkajs';
import { MetricsService } from '../monitoring/metrics.service';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer: Producer;
  private isConnected = false;
  private readonly logger = new Logger(KafkaService.name);
  private readonly clientId: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly metricsService: MetricsService,
  ) {
    this.clientId = this.configService.get<string>('KAFKA_CLIENT_ID', 'salomon-ai');
    this.kafka = new Kafka({
      brokers: [this.configService.get<string>('KAFKA_BROKER', 'localhost:9092')],
      retry: {
        initialRetryTime: 100,
        retries: 5
      }
    });
    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000
    });

    this.metricsService.updateQueueConnectionState(this.clientId, false);
  }

  async onModuleInit() {
    try {
      await this.producer.connect();
      this.isConnected = true;
      this.logger.log('Successfully connected to Kafka');
      this.metricsService.updateQueueConnectionState(this.clientId, true);
    } catch (error) {
      this.logger.error('Failed to connect to Kafka', error);
      this.metricsService.updateQueueConnectionState(this.clientId, false);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.producer.disconnect();
      this.isConnected = false;
      this.logger.log('Successfully disconnected from Kafka');
      this.metricsService.updateQueueConnectionState(this.clientId, false);
    } catch (error) {
      this.logger.error('Error disconnecting from Kafka', error);
      this.metricsService.updateQueueConnectionState(this.clientId, false);
      throw error;
    }
  }

  async produce(record: ProducerRecord): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka producer is not connected');
    }

    try {
      await this.producer.send(record);
      this.logger.debug(`Successfully sent message to topic ${record.topic}`);
      this.metricsService.recordQueueMessage(record.topic, 'sent');
    } catch (error) {
      this.logger.error(`Failed to send message to topic ${record.topic}`, error);
      this.metricsService.recordQueueMessage(record.topic, 'failed');
      throw new Error(`Failed to send message to Kafka: ${error.message}`);
    }
  }

  async produceWithRetry(record: ProducerRecord, maxRetries = 3): Promise<void> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.produce(record);
        return;
      } catch (error) {
        lastError = error;
        this.logger.warn(`Failed to send message (attempt ${attempt}/${maxRetries})`, error);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    throw lastError;
  }
}