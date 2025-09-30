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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PredictiveAlertsService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const financial_forecasts_service_1 = require("../financial-forecasts/financial-forecasts.service");
let PredictiveAlertsService = class PredictiveAlertsService {
    constructor(forecastsService) {
        this.forecastsService = forecastsService;
    }
    async generateAlerts(userId) {
        const forecasts = await this.forecastsService.getForecastSeries(userId);
        if (forecasts.length === 0) {
            return [];
        }
        const alerts = [];
        const amounts = forecasts.map((item) => Number(item.predictedValue));
        const minValue = Math.min(...amounts);
        if (minValue < -50000) {
            const criticalPoint = forecasts[amounts.indexOf(minValue)];
            alerts.push({
                id: (0, uuid_1.v4)(),
                type: 'cashflow',
                severity: 'high',
                message: 'Se proyecta un déficit de caja significativo en los próximos días.',
                forecastDate: criticalPoint.forecastDate.toISOString().split('T')[0],
                details: {
                    expectedAmount: Number(minValue.toFixed(2)),
                },
            });
        }
        const last = amounts[amounts.length - 1];
        const average = amounts.reduce((acc, value) => acc + value, 0) / amounts.length;
        if (last < average * 0.6) {
            const criticalPoint = forecasts[forecasts.length - 1];
            alerts.push({
                id: (0, uuid_1.v4)(),
                type: 'spending',
                severity: 'medium',
                message: 'Tus gastos proyectados superan el promedio reciente. Considera revisar tus categorías de gasto.',
                forecastDate: criticalPoint.forecastDate.toISOString().split('T')[0],
                details: {
                    projectedAmount: Number(last.toFixed(2)),
                    averageAmount: Number(average.toFixed(2)),
                },
            });
        }
        const positiveTrend = last - amounts[0];
        if (positiveTrend > 80000) {
            alerts.push({
                id: (0, uuid_1.v4)(),
                type: 'savings',
                severity: 'low',
                message: 'Se proyecta un excedente de liquidez. Evalúa mover parte a tu fondo de ahorro.',
                forecastDate: forecasts[forecasts.length - 1].forecastDate.toISOString().split('T')[0],
                details: {
                    projectedIncrease: Number(positiveTrend.toFixed(2)),
                },
            });
        }
        return alerts;
    }
};
exports.PredictiveAlertsService = PredictiveAlertsService;
exports.PredictiveAlertsService = PredictiveAlertsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [financial_forecasts_service_1.FinancialForecastsService])
], PredictiveAlertsService);
//# sourceMappingURL=predictive-alerts.service.js.map