"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var DashboardModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const dashboard_controller_1 = require("./dashboard.controller");
const financial_movements_module_1 = require("../financial-movements/financial-movements.module");
const financial_forecasts_module_1 = require("../financial-forecasts/financial-forecasts.module");
const goals_module_1 = require("../goals/goals.module");
const recommendations_service_1 = require("./recommendations.service");
const noop_recommendations_service_1 = require("./noop-recommendations.service");
const recommendations_tokens_1 = require("./recommendations.tokens");
let DashboardModule = DashboardModule_1 = class DashboardModule {
    static register(options) {
        const httpModule = options.recommendationsEnabled
            ? [
                axios_1.HttpModule.registerAsync({
                    imports: [config_1.ConfigModule],
                    inject: [config_1.ConfigService],
                    useFactory: (configService) => ({
                        baseURL: configService.get('app.recommendations')?.engineUrl ||
                            configService.get('RECOMMENDATION_ENGINE_URL', 'http://recommendation-engine:8004'),
                        timeout: configService.get('app.recommendations')?.timeoutMs ||
                            configService.get('RECOMMENDATION_ENGINE_TIMEOUT_MS', 8000),
                    }),
                }),
            ]
            : [];
        const providers = options.recommendationsEnabled
            ? [
                recommendations_service_1.RecommendationsService,
                {
                    provide: recommendations_tokens_1.RECOMMENDATIONS_SERVICE,
                    useExisting: recommendations_service_1.RecommendationsService,
                },
            ]
            : [
                noop_recommendations_service_1.NoopRecommendationsService,
                {
                    provide: recommendations_tokens_1.RECOMMENDATIONS_SERVICE,
                    useExisting: noop_recommendations_service_1.NoopRecommendationsService,
                },
            ];
        return {
            module: DashboardModule_1,
            imports: [financial_movements_module_1.FinancialMovementsModule, financial_forecasts_module_1.FinancialForecastsModule, goals_module_1.GoalsModule, config_1.ConfigModule, ...httpModule],
            controllers: [dashboard_controller_1.DashboardController],
            providers,
            exports: [recommendations_tokens_1.RECOMMENDATIONS_SERVICE],
        };
    }
};
exports.DashboardModule = DashboardModule;
exports.DashboardModule = DashboardModule = DashboardModule_1 = __decorate([
    (0, common_1.Module)({})
], DashboardModule);
//# sourceMappingURL=dashboard.module.js.map