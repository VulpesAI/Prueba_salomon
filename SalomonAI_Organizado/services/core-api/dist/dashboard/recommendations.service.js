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
var RecommendationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecommendationsService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const rxjs_1 = require("rxjs");
let RecommendationsService = RecommendationsService_1 = class RecommendationsService {
    constructor(httpService, configService) {
        this.httpService = httpService;
        this.configService = configService;
        this.logger = new common_1.Logger(RecommendationsService_1.name);
        const config = this.configService.get('app.recommendations');
        this.timeout = config?.timeoutMs || this.configService.get('RECOMMENDATION_ENGINE_TIMEOUT_MS', 8000);
    }
    async getPersonalizedRecommendations(userId, refresh = false) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`/recommendations/personalized/${userId}`, {
                params: refresh ? { refresh: true } : undefined,
                timeout: this.timeout,
            }));
            return response.data;
        }
        catch (error) {
            const axiosError = error;
            if (axiosError.response?.status === 404) {
                this.logger.warn(`No hay recomendaciones disponibles para el usuario ${userId}`);
                return {
                    userId,
                    generatedAt: new Date().toISOString(),
                    recommendations: [],
                    featureSummary: null,
                };
            }
            const message = axiosError.message || 'Error desconocido al solicitar recomendaciones personalizadas';
            this.logger.error(`RecommendationEngine error: ${message}`, axiosError.stack);
            throw new common_1.InternalServerErrorException('No fue posible obtener recomendaciones personalizadas.');
        }
    }
    async sendFeedback(userId, payload) {
        try {
            await (0, rxjs_1.firstValueFrom)(this.httpService.post('/recommendations/feedback', {
                recommendationId: payload.recommendationId,
                userId,
                score: payload.score,
                comment: payload.comment,
            }, {
                timeout: this.timeout,
            }));
        }
        catch (error) {
            const axiosError = error;
            const message = axiosError.message || 'Error desconocido al enviar feedback de recomendaciones';
            this.logger.error(`No fue posible enviar feedback: ${message}`, axiosError.stack);
            throw new common_1.InternalServerErrorException('No fue posible registrar tu feedback en este momento.');
        }
    }
};
exports.RecommendationsService = RecommendationsService;
exports.RecommendationsService = RecommendationsService = RecommendationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        config_1.ConfigService])
], RecommendationsService);
//# sourceMappingURL=recommendations.service.js.map