"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialForecastsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const financial_forecast_entity_1 = require("./entities/financial-forecast.entity");
const financial_forecasts_service_1 = require("./financial-forecasts.service");
const financial_forecasts_scheduler_1 = require("./financial-forecasts.scheduler");
const users_module_1 = require("../users/users.module");
let FinancialForecastsModule = class FinancialForecastsModule {
};
exports.FinancialForecastsModule = FinancialForecastsModule;
exports.FinancialForecastsModule = FinancialForecastsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([financial_forecast_entity_1.FinancialForecast]), axios_1.HttpModule, config_1.ConfigModule, users_module_1.UsersModule],
        providers: [financial_forecasts_service_1.FinancialForecastsService, financial_forecasts_scheduler_1.FinancialForecastsScheduler],
        exports: [financial_forecasts_service_1.FinancialForecastsService],
    })
], FinancialForecastsModule);
//# sourceMappingURL=financial-forecasts.module.js.map