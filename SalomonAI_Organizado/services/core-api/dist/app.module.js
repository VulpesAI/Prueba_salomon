"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const cache_manager_1 = require("@nestjs/cache-manager");
const event_emitter_1 = require("@nestjs/event-emitter");
const schedule_1 = require("@nestjs/schedule");
const throttler_1 = require("@nestjs/throttler");
const nest_winston_1 = require("nest-winston");
const config_module_options_1 = require("./config/config.module-options");
const logger_config_1 = require("./config/logger.config");
const app_config_1 = require("./config/app.config");
const auth_module_1 = require("./auth/auth.module");
const user_module_1 = require("./users/user.module");
const firebase_module_1 = require("./firebase/firebase.module");
const kafka_module_1 = require("./kafka/kafka.module");
const qdrant_module_1 = require("./qdrant/qdrant.module");
const classification_module_1 = require("./classification/classification.module");
const classification_rules_module_1 = require("./classification-rules/classification-rules.module");
const nlp_module_1 = require("./nlp/nlp.module");
const transactions_module_1 = require("./transactions/transactions.module");
const health_module_1 = require("./health/health.module");
const dashboard_module_1 = require("./dashboard/dashboard.module");
const belvo_module_1 = require("./belvo/belvo.module");
const financial_forecasts_module_1 = require("./financial-forecasts/financial-forecasts.module");
const alerts_module_1 = require("./alerts/alerts.module");
const notifications_module_1 = require("./notifications/notifications.module");
const goals_module_1 = require("./goals/goals.module");
const security_module_1 = require("./security/security.module");
const privacy_module_1 = require("./privacy/privacy.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot(config_module_options_1.configModuleOptions),
            nest_winston_1.WinstonModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => (0, logger_config_1.createLoggerConfig)(configService),
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => (0, app_config_1.createDatabaseConfig)(configService),
            }),
            cache_manager_1.CacheModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => (0, app_config_1.createCacheConfig)(configService),
            }),
            event_emitter_1.EventEmitterModule.forRoot({
                wildcard: true,
                delimiter: '.',
                newListener: false,
                removeListener: false,
                maxListeners: 20,
                verboseMemoryLeak: false,
                ignoreErrors: false,
            }),
            schedule_1.ScheduleModule.forRoot(),
            throttler_1.ThrottlerModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => (0, app_config_1.createThrottlerConfig)(configService),
            }),
            auth_module_1.AuthModule,
            user_module_1.UserModule,
            firebase_module_1.FirebaseModule,
            dashboard_module_1.DashboardModule,
            belvo_module_1.BelvoModule,
            financial_forecasts_module_1.FinancialForecastsModule,
            alerts_module_1.AlertsModule,
            notifications_module_1.NotificationsModule,
            goals_module_1.GoalsModule,
            transactions_module_1.TransactionsModule,
            classification_module_1.ClassificationModule,
            classification_rules_module_1.ClassificationRulesModule,
            nlp_module_1.NlpModule,
            kafka_module_1.KafkaModule,
            qdrant_module_1.QdrantModule,
            health_module_1.HealthModule,
            security_module_1.SecurityModule,
            privacy_module_1.PrivacyModule,
        ],
        controllers: [],
        providers: [],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map