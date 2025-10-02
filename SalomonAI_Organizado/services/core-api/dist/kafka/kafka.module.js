"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var KafkaModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const kafka_service_1 = require("./kafka.service");
const noop_kafka_service_1 = require("./noop-kafka.service");
const kafka_tokens_1 = require("./kafka.tokens");
let KafkaModule = KafkaModule_1 = class KafkaModule {
    static register(options) {
        const providers = options.enabled
            ? [
                kafka_service_1.KafkaService,
                {
                    provide: kafka_tokens_1.KAFKA_SERVICE,
                    useExisting: kafka_service_1.KafkaService,
                },
            ]
            : [
                noop_kafka_service_1.NoopKafkaService,
                {
                    provide: kafka_tokens_1.KAFKA_SERVICE,
                    useExisting: noop_kafka_service_1.NoopKafkaService,
                },
                {
                    provide: kafka_service_1.KafkaService,
                    useExisting: noop_kafka_service_1.NoopKafkaService,
                },
            ];
        return {
            module: KafkaModule_1,
            imports: [config_1.ConfigModule],
            providers,
            exports: [kafka_tokens_1.KAFKA_SERVICE, kafka_service_1.KafkaService],
        };
    }
};
exports.KafkaModule = KafkaModule;
exports.KafkaModule = KafkaModule = KafkaModule_1 = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({})
], KafkaModule);
//# sourceMappingURL=kafka.module.js.map