import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, ProducerRecord } from 'kafkajs';
import { KafkaProducerService } from './kafka.tokens';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy, KafkaProducerService {
  private kafka: Kafka;
  private producer: Producer;
  private isConnected = false;
  private readonly logger = new Logger(KafkaService.name);

  constructor(private readonly configService: ConfigService) {
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
  }

  async onModuleInit() {
    try {
      await this.producer.connect();
      this.isConnected = true;
      this.logger.log('Successfully connected to Kafka');
    } catch (error) {
      const isStrictEnv = this.configService.get<boolean>('STRICT_ENV', false);
      const profile = this.configService.get<'minimal' | 'full'>('app.profile',
        this.configService.get<'minimal' | 'full'>('CORE_API_PROFILE', 'minimal'));

      if (!isStrictEnv || profile === 'minimal') {
        const reason = !isStrictEnv
          ? 'STRICT_ENV is disabled'
          : 'profile is set to minimal';
        this.logger.warn(
          `Kafka broker is unavailable. Continuing without Kafka because ${reason}.`,
          error,
        );
        return;
      }

      this.logger.error('Failed to connect to Kafka', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.producer.disconnect();
      this.isConnected = false;
      this.logger.log('Successfully disconnected from Kafka');
    } catch (error) {
      this.logger.error('Error disconnecting from Kafka', error);
      throw error;
    }
  }

  async produce(record: ProducerRecord): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn(
        `Kafka producer is not connected; skipping send to topic ${record.topic}`,
      );
      return;
    }

    try {
      await this.producer.send(record);
      this.logger.debug(`Successfully sent message to topic ${record.topic}`);
    } catch (error) {
      this.logger.error(`Failed to send message to topic ${record.topic}`, error);
      throw new Error(`Failed to send message to Kafka: ${error.message}`);
    }
  }

  async produceWithRetry(record: ProducerRecord, maxRetries = 3): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn(
        `Kafka producer is not connected; skipping retry send to topic ${record.topic}`,
      );
      return;
    }

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