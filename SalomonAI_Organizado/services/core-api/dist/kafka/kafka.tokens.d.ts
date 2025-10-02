export declare const KAFKA_SERVICE: unique symbol;
export interface KafkaProducerService {
    onModuleInit(): Promise<void> | void;
    onModuleDestroy(): Promise<void> | void;
    produce(record: import('kafkajs').ProducerRecord): Promise<void>;
    produceWithRetry(record: import('kafkajs').ProducerRecord, maxRetries?: number): Promise<void>;
}
