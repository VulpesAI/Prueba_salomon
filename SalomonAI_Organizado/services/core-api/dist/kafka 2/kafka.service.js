"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var KafkaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const kafkajs_1 = require("kafkajs");
let KafkaService = KafkaService_1 = class KafkaService {
    constructor(configService) {
        this.configService = configService;
        this.isConnected = false;
        this.logger = new common_1.Logger(KafkaService_1.name);
        this.kafka = new kafkajs_1.Kafka({
            brokers: [this.configService.get('KAFKA_BROKER', 'localhost:9092')],
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
        }
        catch (error) {
            this.logger.error('Failed to connect to Kafka', error);
            throw error;
        }
    }
    async onModuleDestroy() {
        try {
            await this.producer.disconnect();
            this.isConnected = false;
            this.logger.log('Successfully disconnected from Kafka');
        }
        catch (error) {
            this.logger.error('Error disconnecting from Kafka', error);
            throw error;
        }
    }
    async produce(record) {
        if (!this.isConnected) {
            throw new Error('Kafka producer is not connected');
        }
        try {
            await this.producer.send(record);
            this.logger.debug(`Successfully sent message to topic ${record.topic}`);
        }
        catch (error) {
            this.logger.error(`Failed to send message to topic ${record.topic}`, error);
            throw new Error(`Failed to send message to Kafka: ${error.message}`);
        }
    }
    async produceWithRetry(record, maxRetries = 3) {
        let lastError;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await this.produce(record);
                return;
            }
            catch (error) {
                lastError = error;
                this.logger.warn(`Failed to send message (attempt ${attempt}/${maxRetries})`, error);
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                }
            }
        }
        throw lastError;
    }
};
exports.KafkaService = KafkaService;
exports.KafkaService = KafkaService = KafkaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], KafkaService);
//# sourceMappingURL=kafka.service.js.map