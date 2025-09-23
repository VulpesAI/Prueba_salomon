"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassificationModule = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const event_emitter_1 = require("@nestjs/event-emitter");
const schedule_1 = require("@nestjs/schedule");
const throttler_1 = require("@nestjs/throttler");
const classification_service_1 = require("./classification.service");
const classification_controller_1 = require("./classification.controller");
const nlp_module_1 = require("../nlp/nlp.module");
const qdrant_module_1 = require("../qdrant/qdrant.module");
let ClassificationModule = class ClassificationModule {
};
exports.ClassificationModule = ClassificationModule;
exports.ClassificationModule = ClassificationModule = __decorate([
    (0, common_1.Module)({
        imports: [
            nlp_module_1.NlpModule,
            qdrant_module_1.QdrantModule,
            cache_manager_1.CacheModule.register({
                ttl: 300,
                max: 100,
            }),
            event_emitter_1.EventEmitterModule.forRoot({
                wildcard: true,
                delimiter: '.',
                newListener: false,
                removeListener: false,
                maxListeners: 20,
                verboseMemoryLeak: true,
                ignoreErrors: false,
            }),
            schedule_1.ScheduleModule.forRoot(),
            throttler_1.ThrottlerModule.forRoot([
                {
                    name: 'short',
                    ttl: 1000,
                    limit: 10,
                },
                {
                    name: 'medium',
                    ttl: 60000,
                    limit: 100,
                },
                {
                    name: 'long',
                    ttl: 3600000,
                    limit: 1000,
                },
            ]),
        ],
        controllers: [classification_controller_1.ClassificationController],
        providers: [classification_service_1.ClassificationService],
        exports: [classification_service_1.ClassificationService],
    })
], ClassificationModule);
//# sourceMappingURL=classification.module.js.map