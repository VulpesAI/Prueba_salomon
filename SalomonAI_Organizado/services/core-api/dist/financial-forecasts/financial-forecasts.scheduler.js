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
var FinancialForecastsScheduler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialForecastsScheduler = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const config_1 = require("@nestjs/config");
const financial_forecasts_service_1 = require("./financial-forecasts.service");
const users_service_1 = require("../users/users.service");
let FinancialForecastsScheduler = FinancialForecastsScheduler_1 = class FinancialForecastsScheduler {
    constructor(forecastsService, usersService, configService) {
        this.forecastsService = forecastsService;
        this.usersService = usersService;
        this.configService = configService;
        this.logger = new common_1.Logger(FinancialForecastsScheduler_1.name);
        this.horizonDays =
            this.configService.get('app.forecasting.horizonDays') ||
                this.configService.get('FORECASTING_DEFAULT_HORIZON_DAYS', 30);
    }
    async refreshForecastsForUsers() {
        const { users } = await this.usersService.findAll(1000, 0);
        this.logger.log(`Iniciando recalculo de proyecciones para ${users.length} usuarios`);
        for (const user of users.filter((item) => item.isActive)) {
            try {
                await this.forecastsService.refreshForecastsForUser(user.id, this.horizonDays);
            }
            catch (error) {
                this.logger.warn(`Fallo al recalcular proyección para usuario ${user.id}`, error instanceof Error ? error.stack : undefined);
            }
        }
        this.logger.log('Finalizó la tarea programada de proyecciones financieras');
    }
};
exports.FinancialForecastsScheduler = FinancialForecastsScheduler;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_1AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FinancialForecastsScheduler.prototype, "refreshForecastsForUsers", null);
exports.FinancialForecastsScheduler = FinancialForecastsScheduler = FinancialForecastsScheduler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [financial_forecasts_service_1.FinancialForecastsService,
        users_service_1.UsersService,
        config_1.ConfigService])
], FinancialForecastsScheduler);
//# sourceMappingURL=financial-forecasts.scheduler.js.map