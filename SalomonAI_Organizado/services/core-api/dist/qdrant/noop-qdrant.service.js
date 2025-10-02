"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var NoopQdrantService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoopQdrantService = void 0;
const common_1 = require("@nestjs/common");
let NoopQdrantService = NoopQdrantService_1 = class NoopQdrantService {
    constructor() {
        this.logger = new common_1.Logger(NoopQdrantService_1.name);
    }
    async onModuleInit() {
        this.logger.warn('Qdrant URL is not configured. Using NoopQdrantService.');
    }
    async healthCheck() {
        return false;
    }
    async createCollection() {
        this.logger.debug('Skipping Qdrant collection creation because Qdrant is disabled.');
    }
    async search() {
        this.logger.debug('Skipping Qdrant search because Qdrant is disabled.');
        return [];
    }
    async upsertPoint() {
        this.logger.debug('Skipping Qdrant point upsert because Qdrant is disabled.');
    }
    async upsert() {
        this.logger.debug('Skipping Qdrant batch upsert because Qdrant is disabled.');
    }
};
exports.NoopQdrantService = NoopQdrantService;
exports.NoopQdrantService = NoopQdrantService = NoopQdrantService_1 = __decorate([
    (0, common_1.Injectable)()
], NoopQdrantService);
//# sourceMappingURL=noop-qdrant.service.js.map