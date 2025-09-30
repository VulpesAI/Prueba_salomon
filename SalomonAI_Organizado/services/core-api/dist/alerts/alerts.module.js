"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const alerts_controller_1 = require("./alerts.controller");
const predictive_alerts_service_1 = require("./predictive-alerts.service");
const financial_forecasts_module_1 = require("../financial-forecasts/financial-forecasts.module");
const firebase_module_1 = require("../firebase/firebase.module");
const notification_entity_1 = require("../notifications/entities/notification.entity");
const user_entity_1 = require("../users/entities/user.entity");
const alert_orchestrator_service_1 = require("./alert-orchestrator.service");
const alert_rule_evaluator_service_1 = require("./alert-rule-evaluator.service");
const sendgrid_email_provider_1 = require("./providers/sendgrid-email.provider");
const firebase_push_provider_1 = require("./providers/firebase-push.provider");
const twilio_sms_provider_1 = require("./providers/twilio-sms.provider");
let AlertsModule = class AlertsModule {
};
exports.AlertsModule = AlertsModule;
exports.AlertsModule = AlertsModule = __decorate([
    (0, common_1.Module)({
        imports: [financial_forecasts_module_1.FinancialForecastsModule, firebase_module_1.FirebaseModule, typeorm_1.TypeOrmModule.forFeature([notification_entity_1.Notification, user_entity_1.User])],
        controllers: [alerts_controller_1.AlertsController],
        providers: [
            predictive_alerts_service_1.PredictiveAlertsService,
            alert_orchestrator_service_1.AlertOrchestratorService,
            alert_rule_evaluator_service_1.AlertRuleEvaluatorService,
            sendgrid_email_provider_1.SendGridEmailProvider,
            firebase_push_provider_1.FirebasePushProvider,
            twilio_sms_provider_1.TwilioSmsProvider,
        ],
        exports: [predictive_alerts_service_1.PredictiveAlertsService, alert_orchestrator_service_1.AlertOrchestratorService],
    })
], AlertsModule);
//# sourceMappingURL=alerts.module.js.map