import { Injectable, Logger } from '@nestjs/common';
import { ProducerRecord } from 'kafkajs';
import { KafkaProducerService } from './kafka.tokens';

@Injectable()
export class NoopKafkaService implements KafkaProducerService {
  private readonly logger = new Logger(NoopKafkaService.name);

  async onModuleInit(): Promise<void> {
    this.logger.warn('Kafka broker is not configured. Using NoopKafkaService.');
  }

  async onModuleDestroy(): Promise<void> {
    // Nothing to clean up
  }

  async produce(record: ProducerRecord): Promise<void> {
    this.logger.debug(
      `Skipping Kafka message for topic ${record.topic} because Kafka is disabled.`,
    );
  }

  async produceWithRetry(record: ProducerRecord): Promise<void> {
    await this.produce(record);
  }
}
