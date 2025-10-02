"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var NoopKafkaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoopKafkaService = void 0;
const common_1 = require("@nestjs/common");
let NoopKafkaService = NoopKafkaService_1 = class NoopKafkaService {
    constructor() {
        this.logger = new common_1.Logger(NoopKafkaService_1.name);
    }
    async onModuleInit() {
        this.logger.warn('Kafka broker is not configured. Using NoopKafkaService.');
    }
    async onModuleDestroy() {
    }
    async produce(record) {
        this.logger.debug(`Skipping Kafka message for topic ${record.topic} because Kafka is disabled.`);
    }
    async produceWithRetry(record) {
        await this.produce(record);
    }
};
exports.NoopKafkaService = NoopKafkaService;
exports.NoopKafkaService = NoopKafkaService = NoopKafkaService_1 = __decorate([
    (0, common_1.Injectable)()
], NoopKafkaService);
//# sourceMappingURL=noop-kafka.service.js.map