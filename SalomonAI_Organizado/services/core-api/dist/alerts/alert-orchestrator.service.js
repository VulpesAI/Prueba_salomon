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
var AlertOrchestratorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertOrchestratorService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const notification_entity_1 = require("../notifications/entities/notification.entity");
const sendgrid_email_provider_1 = require("./providers/sendgrid-email.provider");
const firebase_push_provider_1 = require("./providers/firebase-push.provider");
const twilio_sms_provider_1 = require("./providers/twilio-sms.provider");
let AlertOrchestratorService = AlertOrchestratorService_1 = class AlertOrchestratorService {
    constructor(notificationRepository, emailProvider, pushProvider, smsProvider) {
        this.notificationRepository = notificationRepository;
        this.emailProvider = emailProvider;
        this.pushProvider = pushProvider;
        this.smsProvider = smsProvider;
        this.logger = new common_1.Logger(AlertOrchestratorService_1.name);
    }
    async dispatchAlert(options) {
        const { user, message, title, eventType, channels = ['in_app'], severity = 'info', metadata, data, } = options;
        const preferences = (user.preferences?.notifications ?? {});
        if (eventType && this.isMuted(preferences.mutedEvents ?? [], eventType)) {
            this.logger.debug(`Skipping alert for muted event ${eventType} and user ${user.id}`);
            return null;
        }
        const allowedChannels = this.resolveChannels(channels, preferences);
        const notification = this.notificationRepository.create({
            user,
            message,
            channel: 'in_app',
            eventType: eventType ?? null,
            severity,
            metadata: {
                ...(metadata ?? {}),
                dispatchedChannels: allowedChannels,
                title,
            },
        });
        const saved = await this.notificationRepository.save(notification);
        await Promise.all(allowedChannels
            .filter((channel) => channel !== 'in_app')
            .map((channel) => this.dispatchToChannel(channel, user, title ?? 'Nueva alerta financiera', message, data ?? {})));
        return saved;
    }
    resolveChannels(requested, preferences) {
        const unique = Array.from(new Set([...requested, 'in_app']));
        return unique.filter((channel) => {
            switch (channel) {
                case 'email':
                    return preferences.email !== false;
                case 'push':
                    return preferences.push === true;
                case 'sms':
                    return preferences.sms === true;
                case 'in_app':
                default:
                    return true;
            }
        });
    }
    async dispatchToChannel(channel, user, title, message, data) {
        switch (channel) {
            case 'email':
                return this.sendEmail(user, title, message);
            case 'push':
                return this.sendPush(user, title, message, data);
            case 'sms':
                return this.sendSms(user, message);
            default:
                return true;
        }
    }
    async sendEmail(user, subject, message) {
        if (!user.email) {
            this.logger.warn(`User ${user.id} lacks email for email notifications.`);
            return false;
        }
        return this.emailProvider.sendEmail(user.email, subject, message);
    }
    async sendPush(user, title, body, data) {
        const preferences = (user.preferences?.notifications ?? {});
        const tokens = preferences.pushTokens ?? [];
        if (tokens.length === 0) {
            this.logger.warn(`User ${user.id} has no registered push tokens.`);
            return false;
        }
        const results = await Promise.all(tokens.map((token) => this.pushProvider.sendPush(token, title, body, data)));
        return results.some((result) => result);
    }
    async sendSms(user, message) {
        if (!user.phoneNumber) {
            this.logger.warn(`User ${user.id} lacks phone number for SMS notifications.`);
            return false;
        }
        return this.smsProvider.sendSms(user.phoneNumber, message);
    }
    isMuted(mutedEvents, eventKey) {
        const now = new Date();
        return mutedEvents.some((entry) => {
            if (entry.key !== eventKey) {
                return false;
            }
            if (!entry.until) {
                return true;
            }
            const untilDate = new Date(entry.until);
            return untilDate.getTime() > now.getTime();
        });
    }
};
exports.AlertOrchestratorService = AlertOrchestratorService;
exports.AlertOrchestratorService = AlertOrchestratorService = AlertOrchestratorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(notification_entity_1.Notification)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        sendgrid_email_provider_1.SendGridEmailProvider,
        firebase_push_provider_1.FirebasePushProvider,
        twilio_sms_provider_1.TwilioSmsProvider])
], AlertOrchestratorService);
//# sourceMappingURL=alert-orchestrator.service.js.map