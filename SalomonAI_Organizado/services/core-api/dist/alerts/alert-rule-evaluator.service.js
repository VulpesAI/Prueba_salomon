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
var AlertRuleEvaluatorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertRuleEvaluatorService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const alert_orchestrator_service_1 = require("./alert-orchestrator.service");
const user_entity_1 = require("../users/entities/user.entity");
let AlertRuleEvaluatorService = AlertRuleEvaluatorService_1 = class AlertRuleEvaluatorService {
    constructor(orchestrator, userRepository) {
        this.orchestrator = orchestrator;
        this.userRepository = userRepository;
        this.logger = new common_1.Logger(AlertRuleEvaluatorService_1.name);
        this.rules = [
            {
                id: 'large-expense',
                trigger: 'transaction',
                description: 'Notifica gastos superiores a 100,000 unidades monetarias.',
                channels: ['email', 'push', 'in_app'],
                severity: 'warning',
                evaluate: ({ event }) => {
                    if (event.transaction.type !== 'EXPENSE') {
                        return null;
                    }
                    const amount = Number(event.transaction.amount);
                    if (Number.isNaN(amount) || amount < 100000) {
                        return null;
                    }
                    return {
                        title: 'Gasto inusual detectado',
                        message: `Se registró un gasto de ${amount.toLocaleString('es-PE', {
                            minimumFractionDigits: 2,
                        })} en ${event.transaction.description}.`,
                        metadata: {
                            amount,
                            description: event.transaction.description,
                            transactionId: event.transaction.id,
                        },
                    };
                },
            },
            {
                id: 'cashflow-downturn',
                trigger: 'metric',
                description: 'Advierte de una tendencia negativa en el flujo proyectado.',
                channels: ['email', 'sms', 'in_app'],
                severity: 'critical',
                evaluate: ({ event }) => {
                    const summary = event.summary ?? {};
                    const trend = summary.trend ?? {};
                    if (trend.direction !== 'downward' || typeof trend.change === 'undefined') {
                        return null;
                    }
                    const change = Number(trend.change ?? 0);
                    if (change > -50000) {
                        return null;
                    }
                    return {
                        title: 'Proyección de flujo en descenso',
                        message: 'Tus proyecciones muestran una caída pronunciada en la liquidez. Revisa tus gastos planificados.',
                        metadata: {
                            trend,
                            category: event.category,
                        },
                        data: {
                            category: event.category,
                            severity: 'critical',
                        },
                    };
                },
            },
        ];
    }
    async handleTransactionCreated(event) {
        await this.evaluateRules('transaction', event);
    }
    async handleMetricsUpdated(event) {
        await this.evaluateRules('metric', event);
    }
    async evaluateRules(trigger, event) {
        const user = await this.userRepository.findOne({ where: { id: event.userId } });
        if (!user) {
            this.logger.warn(`No user found for alert evaluation (trigger=${trigger}, user=${event.userId}).`);
            return;
        }
        const matchingRules = this.rules.filter((rule) => rule.trigger === trigger);
        for (const rule of matchingRules) {
            try {
                const resolution = rule.evaluate({ trigger, event: event, user });
                if (!resolution) {
                    continue;
                }
                await this.orchestrator.dispatchAlert({
                    user,
                    title: resolution.title,
                    message: resolution.message,
                    metadata: resolution.metadata,
                    data: resolution.data,
                    eventType: rule.id,
                    channels: rule.channels,
                    severity: rule.severity,
                });
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                this.logger.error(`Failed to evaluate rule ${rule.id}: ${message}`);
            }
        }
    }
};
exports.AlertRuleEvaluatorService = AlertRuleEvaluatorService;
__decorate([
    (0, event_emitter_1.OnEvent)('transactions.created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AlertRuleEvaluatorService.prototype, "handleTransactionCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('metrics.updated'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AlertRuleEvaluatorService.prototype, "handleMetricsUpdated", null);
exports.AlertRuleEvaluatorService = AlertRuleEvaluatorService = AlertRuleEvaluatorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [alert_orchestrator_service_1.AlertOrchestratorService,
        typeorm_2.Repository])
], AlertRuleEvaluatorService);
//# sourceMappingURL=alert-rule-evaluator.service.js.map