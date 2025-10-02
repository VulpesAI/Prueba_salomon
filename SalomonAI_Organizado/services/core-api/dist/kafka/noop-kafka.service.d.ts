import { ProducerRecord } from 'kafkajs';
import { KafkaProducerService } from './kafka.tokens';
export declare class NoopKafkaService implements KafkaProducerService {
    private readonly logger;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    produce(record: ProducerRecord): Promise<void>;
    produceWithRetry(record: ProducerRecord): Promise<void>;
}
