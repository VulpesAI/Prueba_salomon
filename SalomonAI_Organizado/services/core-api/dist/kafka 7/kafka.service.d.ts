import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProducerRecord } from 'kafkajs';
export declare class KafkaService implements OnModuleInit, OnModuleDestroy {
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
