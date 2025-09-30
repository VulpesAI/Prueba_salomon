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
exports.NotificationsController = void 0;
const common_1 = require("@nestjs/common");
const notifications_service_1 = require("./notifications.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const get_user_decorator_1 = require("../auth/decorators/get-user.decorator");
const user_entity_1 = require("../users/entities/user.entity");
const notification_history_query_dto_1 = require("./dto/notification-history-query.dto");
const update_notification_preferences_dto_1 = require("./dto/update-notification-preferences.dto");
const mute_notification_dto_1 = require("./dto/mute-notification.dto");
let NotificationsController = class NotificationsController {
    constructor(notificationsService) {
        this.notificationsService = notificationsService;
    }
    getNotifications(user, query) {
        const limit = query.limit ?? 50;
        return this.notificationsService.getHistory(user.id, limit, query.channel);
    }
    markAsRead(user, notificationId) {
        return this.notificationsService.markAsRead(notificationId, user.id);
    }
    getPreferences(user) {
        return this.notificationsService.getPreferences(user.id);
    }
    updatePreferences(user, body) {
        return this.notificationsService.updatePreferences(user.id, body);
    }
    muteEvent(user, body) {
        return this.notificationsService.muteEvent(user.id, body.eventKey, body.until);
    }
    unmuteEvent(user, eventKey) {
        return this.notificationsService.unmuteEvent(user.id, eventKey);
    }
};
exports.NotificationsController = NotificationsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, notification_history_query_dto_1.NotificationHistoryQueryDto]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "getNotifications", null);
__decorate([
    (0, common_1.Patch)(':id/read'),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, String]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "markAsRead", null);
__decorate([
    (0, common_1.Get)('preferences'),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "getPreferences", null);
__decorate([
    (0, common_1.Patch)('preferences'),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User,
        update_notification_preferences_dto_1.UpdateNotificationPreferencesDto]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "updatePreferences", null);
__decorate([
    (0, common_1.Post)('mute'),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, mute_notification_dto_1.MuteNotificationDto]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "muteEvent", null);
__decorate([
    (0, common_1.Delete)('mute/:eventKey'),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Param)('eventKey')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, String]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "unmuteEvent", null);
exports.NotificationsController = NotificationsController = __decorate([
    (0, common_1.Controller)('notifications'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService])
], NotificationsController);
//# sourceMappingURL=notifications.controller.js.map