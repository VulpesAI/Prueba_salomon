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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var FinancialForecastsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialForecastsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const typeorm_2 = require("typeorm");
const rxjs_1 = require("rxjs");
const event_emitter_1 = require("@nestjs/event-emitter");
const financial_forecast_entity_1 = require("./entities/financial-forecast.entity");
let FinancialForecastsService = FinancialForecastsService_1 = class FinancialForecastsService {
    constructor(forecastsRepository, httpService, configService, eventEmitter) {
        this.forecastsRepository = forecastsRepository;
        this.httpService = httpService;
        this.configService = configService;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(FinancialForecastsService_1.name);
        this.baseUrl =
            this.configService.get('app.forecasting.engineUrl') ||
                this.configService.get('FORECASTING_ENGINE_URL', 'http://forecasting-engine:8003');
        this.defaultHorizon =
            this.configService.get('app.forecasting.horizonDays') ||
                this.configService.get('FORECASTING_DEFAULT_HORIZON_DAYS', 30);
    }
    async refreshForecastsForUser(userId, horizon = this.defaultHorizon, model = 'auto') {
        try {
            const response = await this.fetchForecastsFromEngine(userId, horizon, model);
            await this.persistForecasts(userId, response);
            const summary = this.toSummary(response);
            this.eventEmitter.emit('metrics.updated', {
                userId,
                category: 'financial-forecast',
                summary,
            });
            return summary;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`No fue posible actualizar proyecciones para el usuario ${userId}: ${message}`, error instanceof Error ? error.stack : undefined);
            return null;
        }
    }
    async getForecastSummary(userId) {
        const records = await this.forecastsRepository.find({
            where: { user: { id: userId } },
            order: { forecastDate: 'ASC' },
        });
        if (records.length === 0) {
            return null;
        }
        const first = records[0];
        const last = records[records.length - 1];
        const forecasts = records.map((forecast) => ({
            date: forecast.forecastDate.toISOString().split('T')[0],
            amount: Number(forecast.predictedValue),
        }));
        const change = Number(last.predictedValue) - Number(first.predictedValue);
        const base = Number(first.predictedValue) === 0 ? 1 : Number(first.predictedValue);
        const changePercentage = (change / base) * 100;
        const direction = changePercentage > 5 ? 'upward' : changePercentage < -5 ? 'downward' : 'stable';
        return {
            modelType: first.modelType,
            generatedAt: first.generatedAt.toISOString(),
            horizonDays: first.horizonDays,
            historyDays: first.metadata?.history_days ?? forecasts.length,
            forecasts,
            trend: {
                direction,
                change: Number(change.toFixed(2)),
                changePercentage: Number(changePercentage.toFixed(2)),
            },
            metadata: first.metadata ?? undefined,
        };
    }
    async getForecastSeries(userId) {
        return this.forecastsRepository.find({
            where: { user: { id: userId } },
            order: { forecastDate: 'ASC' },
        });
    }
    async fetchForecastsFromEngine(userId, horizon, model) {
        const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.baseUrl}/forecasts/${userId}`, {
            params: { horizon, model },
            timeout: 25000,
        }));
        return response.data;
    }
    async persistForecasts(userId, forecast) {
        await this.forecastsRepository
            .createQueryBuilder()
            .delete()
            .where('user_id = :userId', { userId })
            .execute();
        const entries = forecast.forecasts.map((point) => this.forecastsRepository.create({
            user: { id: userId },
            forecastDate: new Date(point.date),
            predictedValue: point.amount,
            modelType: forecast.model_type,
            horizonDays: forecast.horizon_days,
            generatedAt: new Date(forecast.generated_at),
            metadata: {
                ...(forecast.metadata ?? {}),
                history_days: forecast.history_days,
            },
        }));
        if (entries.length > 0) {
            await this.forecastsRepository.save(entries);
        }
    }
    toSummary(response) {
        const forecasts = response.forecasts.map((point) => ({
            date: point.date,
            amount: Number(point.amount),
        }));
        const change = forecasts.length > 0 ? forecasts[forecasts.length - 1].amount - forecasts[0].amount : 0;
        const base = forecasts.length > 0 ? (forecasts[0].amount === 0 ? 1 : forecasts[0].amount) : 1;
        const changePercentage = (change / base) * 100;
        const direction = changePercentage > 5 ? 'upward' : changePercentage < -5 ? 'downward' : 'stable';
        return {
            modelType: response.model_type,
            generatedAt: response.generated_at,
            horizonDays: response.horizon_days,
            historyDays: response.history_days,
            forecasts,
            trend: {
                direction,
                change: Number(change.toFixed(2)),
                changePercentage: Number(changePercentage.toFixed(2)),
            },
            metadata: response.metadata,
        };
    }
};
exports.FinancialForecastsService = FinancialForecastsService;
exports.FinancialForecastsService = FinancialForecastsService = FinancialForecastsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(financial_forecast_entity_1.FinancialForecast)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        axios_1.HttpService,
        config_1.ConfigService,
        event_emitter_1.EventEmitter2])
], FinancialForecastsService);
//# sourceMappingURL=financial-forecasts.service.js.map