import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProducerRecord } from 'kafkajs';
import { KafkaProducerService } from './kafka.tokens';
export declare class KafkaService implements OnModuleInit, OnModuleDestroy, KafkaProducerService {
    private readonly configService;
    private kafka;
    private producer;
    private isConnected;
    private readonly logger;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    produce(record: ProducerRecord): Promise<void>;
    produceWithRetry(record: ProducerRecord, maxRetries?: number): Promise<void>;
}
