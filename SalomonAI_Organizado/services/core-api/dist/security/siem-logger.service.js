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
var SiemLoggerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiemLoggerService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
let SiemLoggerService = SiemLoggerService_1 = class SiemLoggerService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(SiemLoggerService_1.name);
    }
    async logSecurityEvent(event) {
        const endpoint = this.configService.get('SIEM_ENDPOINT');
        const payload = {
            ...event,
            timestamp: new Date().toISOString(),
            environment: this.configService.get('NODE_ENV', 'development'),
            service: 'core-api',
        };
        if (!endpoint) {
            this.logger.log(`[${event.severity}] ${event.type} ${JSON.stringify(payload.metadata ?? {})}`);
            return;
        }
        try {
            await axios_1.default.post(endpoint, payload, {
                timeout: 4000,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.configService.get('SIEM_TOKEN') ?? ''}`,
                },
            });
        }
        catch (error) {
            this.logger.warn(`No fue posible enviar evento al SIEM: ${error}`);
        }
    }
};
exports.SiemLoggerService = SiemLoggerService;
exports.SiemLoggerService = SiemLoggerService = SiemLoggerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], SiemLoggerService);
//# sourceMappingURL=siem-logger.service.js.map