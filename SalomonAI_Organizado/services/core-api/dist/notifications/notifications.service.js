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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const notification_entity_1 = require("./entities/notification.entity");
const user_entity_1 = require("../users/entities/user.entity");
const alert_orchestrator_service_1 = require("../alerts/alert-orchestrator.service");
let NotificationsService = class NotificationsService {
    constructor(notificationRepository, userRepository, alertOrchestrator) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.alertOrchestrator = alertOrchestrator;
    }
    async createNotification(user, message, options = {}) {
        return this.alertOrchestrator.dispatchAlert({
            user,
            message,
            title: options.title,
            channels: options.channels,
            eventType: options.eventType ?? 'manual-notification',
            metadata: options.metadata,
            data: options.data,
            severity: options.severity ?? 'info',
        });
    }
    async markAsRead(notificationId, userId) {
        await this.notificationRepository.update({ id: notificationId, user: { id: userId } }, { read: true });
    }
    async getHistory(userId, limit = 50, channel) {
        return this.notificationRepository.find({
            where: {
                user: { id: userId },
                ...(channel ? { channel } : {}),
            },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }
    async getPreferences(userId) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return this.normalizePreferences(user);
    }
    async updatePreferences(userId, updates) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const preferences = this.normalizePreferences(user);
        const merged = {
            ...preferences,
            ...updates,
            pushTokens: updates.pushTokens ? Array.from(new Set(updates.pushTokens)) : preferences.pushTokens,
        };
        user.preferences = {
            ...(user.preferences ?? {}),
            notifications: merged,
        };
        await this.userRepository.save(user);
        return merged;
    }
    async muteEvent(userId, eventKey, until) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const preferences = this.normalizePreferences(user);
        const mutedEvents = (preferences.mutedEvents ?? []).filter((entry) => entry.key !== eventKey);
        mutedEvents.push({ key: eventKey, until });
        preferences.mutedEvents = mutedEvents;
        user.preferences = {
            ...(user.preferences ?? {}),
            notifications: preferences,
        };
        await this.userRepository.save(user);
        return preferences;
    }
    async unmuteEvent(userId, eventKey) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const preferences = this.normalizePreferences(user);
        preferences.mutedEvents = (preferences.mutedEvents ?? []).filter((entry) => entry.key !== eventKey);
        user.preferences = {
            ...(user.preferences ?? {}),
            notifications: preferences,
        };
        await this.userRepository.save(user);
        return preferences;
    }
    normalizePreferences(user) {
        const defaults = {
            email: true,
            push: false,
            sms: false,
            pushTokens: [],
            mutedEvents: [],
        };
        return {
            ...defaults,
            ...(user.preferences?.notifications ?? {}),
            pushTokens: Array.from(new Set([...(user.preferences?.notifications?.pushTokens ?? [])])),
            mutedEvents: [...(user.preferences?.notifications?.mutedEvents ?? [])],
        };
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(notification_entity_1.Notification)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        alert_orchestrator_service_1.AlertOrchestratorService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map