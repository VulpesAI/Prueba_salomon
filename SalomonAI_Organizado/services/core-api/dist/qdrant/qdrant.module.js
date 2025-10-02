"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var QdrantModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QdrantModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const qdrant_service_1 = require("./qdrant.service");
const noop_qdrant_service_1 = require("./noop-qdrant.service");
const qdrant_tokens_1 = require("./qdrant.tokens");
let QdrantModule = QdrantModule_1 = class QdrantModule {
    static register(options) {
        const providers = options.enabled
            ? [
                qdrant_service_1.QdrantService,
                {
                    provide: qdrant_tokens_1.QDRANT_SERVICE,
                    useExisting: qdrant_service_1.QdrantService,
                },
            ]
            : [
                noop_qdrant_service_1.NoopQdrantService,
                {
                    provide: qdrant_tokens_1.QDRANT_SERVICE,
                    useExisting: noop_qdrant_service_1.NoopQdrantService,
                },
                {
                    provide: qdrant_service_1.QdrantService,
                    useExisting: noop_qdrant_service_1.NoopQdrantService,
                },
            ];
        return {
            module: QdrantModule_1,
            imports: [config_1.ConfigModule],
            providers,
            exports: [qdrant_tokens_1.QDRANT_SERVICE, qdrant_service_1.QdrantService],
        };
    }
};
exports.QdrantModule = QdrantModule;
exports.QdrantModule = QdrantModule = QdrantModule_1 = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({})
], QdrantModule);
//# sourceMappingURL=qdrant.module.js.map