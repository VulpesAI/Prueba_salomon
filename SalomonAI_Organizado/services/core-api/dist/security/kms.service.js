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
var KmsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KmsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
let KmsService = KmsService_1 = class KmsService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(KmsService_1.name);
    }
    async decrypt(ciphertext) {
        const endpoint = this.configService.get('KMS_ENDPOINT');
        if (!endpoint) {
            return Buffer.from(ciphertext, 'base64').toString('utf8');
        }
        try {
            const response = await axios_1.default.post(`${endpoint.replace(/\/$/, '')}/decrypt`, { ciphertext }, {
                timeout: 5000,
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.configService.get('KMS_API_KEY') ?? '',
                },
            });
            if (response.data?.plaintext) {
                return response.data.plaintext;
            }
        }
        catch (error) {
            this.logger.warn(`Fallo al llamar al KMS remoto: ${error}`);
        }
        return Buffer.from(ciphertext, 'base64').toString('utf8');
    }
    async getSecret(secretName) {
        const directValue = this.configService.get(secretName);
        if (directValue) {
            return directValue;
        }
        const ciphertext = this.configService.get(`${secretName}_CIPHERTEXT`);
        if (!ciphertext) {
            return undefined;
        }
        return this.decrypt(ciphertext);
    }
};
exports.KmsService = KmsService;
exports.KmsService = KmsService = KmsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], KmsService);
//# sourceMappingURL=kms.service.js.map