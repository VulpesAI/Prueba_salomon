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
exports.PrivacyController = void 0;
const common_1 = require("@nestjs/common");
const privacy_service_1 = require("./privacy.service");
const create_data_inventory_dto_1 = require("./dto/create-data-inventory.dto");
const update_data_inventory_status_dto_1 = require("./dto/update-data-inventory-status.dto");
const create_retention_policy_dto_1 = require("./dto/create-retention-policy.dto");
const update_retention_policy_dto_1 = require("./dto/update-retention-policy.dto");
const log_consent_dto_1 = require("./dto/log-consent.dto");
const update_consent_status_dto_1 = require("./dto/update-consent-status.dto");
const sync_cookie_preferences_dto_1 = require("./dto/sync-cookie-preferences.dto");
const create_dsar_request_dto_1 = require("./dto/create-dsar-request.dto");
const resolve_dsar_request_dto_1 = require("./dto/resolve-dsar-request.dto");
const data_inventory_entity_1 = require("./entities/data-inventory.entity");
const dsar_request_entity_1 = require("./entities/dsar-request.entity");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let PrivacyController = class PrivacyController {
    constructor(privacyService) {
        this.privacyService = privacyService;
    }
    isPrivacyAdmin(user) {
        return (Array.isArray(user?.roles) &&
            user.roles.some((role) => role === 'admin' || role === 'dpo'));
    }
    ensurePrivacyAdmin(user) {
        if (!this.isPrivacyAdmin(user)) {
            throw new common_1.ForbiddenException('Solo el DPO o un administrador puede realizar esta acción.');
        }
    }
    resolveActor(user) {
        return user?.email ?? user?.id ?? 'api';
    }
    getInventory(req, dataSubjectId, dataCategory, status) {
        const user = req.user;
        const isAdmin = this.isPrivacyAdmin(user);
        if (!isAdmin && dataSubjectId && dataSubjectId !== user.id) {
            throw new common_1.ForbiddenException('No puedes consultar inventarios de otros usuarios.');
        }
        return this.privacyService.getDataInventory({
            dataSubjectId: dataSubjectId ?? (isAdmin ? undefined : user.id),
            dataCategory,
            status,
        });
    }
    createInventory(req, dto) {
        const user = req.user;
        this.ensurePrivacyAdmin(user);
        return this.privacyService.createDataInventory({
            ...dto,
            requestedBy: this.resolveActor(user),
        });
    }
    updateInventoryStatus(id, req, dto) {
        const user = req.user;
        this.ensurePrivacyAdmin(user);
        return this.privacyService.updateDataInventoryStatus(id, {
            ...dto,
            requestedBy: this.resolveActor(user),
        });
    }
    getRetentionPolicies(req) {
        this.ensurePrivacyAdmin(req.user);
        return this.privacyService.getRetentionPolicies();
    }
    createRetentionPolicy(req, dto) {
        const user = req.user;
        this.ensurePrivacyAdmin(user);
        return this.privacyService.createRetentionPolicy({
            ...dto,
            requestedBy: this.resolveActor(user),
        });
    }
    updateRetentionPolicy(id, req, dto) {
        const user = req.user;
        this.ensurePrivacyAdmin(user);
        return this.privacyService.updateRetentionPolicy(id, {
            ...dto,
            requestedBy: this.resolveActor(user),
        });
    }
    getConsents(req, userId) {
        const user = req.user;
        const isAdmin = this.isPrivacyAdmin(user);
        if (!isAdmin && userId && userId !== user.id) {
            throw new common_1.ForbiddenException('No puedes consultar consentimientos de otros usuarios.');
        }
        return this.privacyService.getConsentLogs(userId ?? (isAdmin ? undefined : user.id));
    }
    logConsent(req, dto) {
        const user = req.user;
        const isAdmin = this.isPrivacyAdmin(user);
        if (!isAdmin && dto.userId && dto.userId !== user.id) {
            throw new common_1.ForbiddenException('No puedes registrar consentimientos de otros usuarios.');
        }
        return this.privacyService.logConsent({
            ...dto,
            userId: dto.userId ?? user.id,
            requestedBy: this.resolveActor(user),
        });
    }
    async updateConsent(id, req, dto) {
        const user = req.user;
        const isAdmin = this.isPrivacyAdmin(user);
        const consent = await this.privacyService.getConsentLogById(id);
        if (!consent) {
            return this.privacyService.updateConsentStatus(id, {
                ...dto,
                requestedBy: this.resolveActor(user),
            });
        }
        if (!isAdmin && consent.userId !== user.id) {
            throw new common_1.ForbiddenException('No puedes modificar consentimientos de otros usuarios.');
        }
        return this.privacyService.updateConsentStatus(id, {
            ...dto,
            requestedBy: this.resolveActor(user),
        });
    }
    syncCookiePreferences(req, dto) {
        const user = req.user;
        const isAdmin = this.isPrivacyAdmin(user);
        if (!isAdmin && dto.userId && dto.userId !== user.id) {
            throw new common_1.ForbiddenException('No puedes sincronizar preferencias de otros usuarios.');
        }
        return this.privacyService.syncCookiePreferences({
            ...dto,
            userId: dto.userId ?? user.id,
            requestedBy: this.resolveActor(user),
        });
    }
    getCookiePreferences(req, userId) {
        const user = req.user;
        if (!this.isPrivacyAdmin(user) && user.id !== userId) {
            throw new common_1.ForbiddenException('No puedes consultar preferencias de otros usuarios.');
        }
        return this.privacyService.getCookiePreferences(userId);
    }
    listDsar(req, userId) {
        const user = req.user;
        const isAdmin = this.isPrivacyAdmin(user);
        if (!isAdmin && userId && userId !== user.id) {
            throw new common_1.ForbiddenException('No puedes consultar solicitudes de otros usuarios.');
        }
        return this.privacyService.listDsarRequests(userId ?? (isAdmin ? undefined : user.id));
    }
    requestAccess(req, dto) {
        const user = req.user;
        const isAdmin = this.isPrivacyAdmin(user);
        if (!isAdmin && dto.userId && dto.userId !== user.id) {
            throw new common_1.ForbiddenException('No puedes crear solicitudes para otros usuarios.');
        }
        return this.privacyService.requestAccess({
            ...dto,
            userId: dto.userId ?? user.id,
            requestedBy: this.resolveActor(user),
            type: dsar_request_entity_1.DsarRequestType.ACCESS,
        });
    }
    requestRectification(req, dto) {
        const user = req.user;
        const isAdmin = this.isPrivacyAdmin(user);
        if (!isAdmin && dto.userId && dto.userId !== user.id) {
            throw new common_1.ForbiddenException('No puedes crear solicitudes para otros usuarios.');
        }
        return this.privacyService.requestRectification({
            ...dto,
            userId: dto.userId ?? user.id,
            requestedBy: this.resolveActor(user),
            type: dsar_request_entity_1.DsarRequestType.RECTIFICATION,
        });
    }
    requestErasure(req, dto) {
        const user = req.user;
        const isAdmin = this.isPrivacyAdmin(user);
        if (!isAdmin && dto.userId && dto.userId !== user.id) {
            throw new common_1.ForbiddenException('No puedes crear solicitudes para otros usuarios.');
        }
        return this.privacyService.requestErasure({
            ...dto,
            userId: dto.userId ?? user.id,
            requestedBy: this.resolveActor(user),
            type: dsar_request_entity_1.DsarRequestType.ERASURE,
        });
    }
    resolveDsar(id, req, dto) {
        const user = req.user;
        this.ensurePrivacyAdmin(user);
        return this.privacyService.resolveDsarRequest(id, {
            ...dto,
            completedBy: dto.completedBy ?? this.resolveActor(user),
        });
    }
    runRetentionSweep(req, actor = 'api') {
        const user = req.user;
        this.ensurePrivacyAdmin(user);
        const resolvedActor = actor === 'api' ? this.resolveActor(user) : actor;
        return this.privacyService.processRetentionSweep(resolvedActor);
    }
    getAuditLogs(req, limit) {
        this.ensurePrivacyAdmin(req.user);
        return this.privacyService.getAuditLogs(limit);
    }
};
exports.PrivacyController = PrivacyController;
__decorate([
    (0, common_1.Get)('inventory'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('dataSubjectId')),
    __param(2, (0, common_1.Query)('dataCategory')),
    __param(3, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], PrivacyController.prototype, "getInventory", null);
__decorate([
    (0, common_1.Post)('inventory'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_data_inventory_dto_1.CreateDataInventoryDto]),
    __metadata("design:returntype", void 0)
], PrivacyController.prototype, "createInventory", null);
__decorate([
    (0, common_1.Patch)('inventory/:id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, update_data_inventory_status_dto_1.UpdateDataInventoryStatusDto]),
    __metadata("design:returntype", void 0)
], PrivacyController.prototype, "updateInventoryStatus", null);
__decorate([
    (0, common_1.Get)('retention-policies'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PrivacyController.prototype, "getRetentionPolicies", null);
__decorate([
    (0, common_1.Post)('retention-policies'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_retention_policy_dto_1.CreateRetentionPolicyDto]),
    __metadata("design:returntype", void 0)
], PrivacyController.prototype, "createRetentionPolicy", null);
__decorate([
    (0, common_1.Patch)('retention-policies/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, update_retention_policy_dto_1.UpdateRetentionPolicyDto]),
    __metadata("design:returntype", void 0)
], PrivacyController.prototype, "updateRetentionPolicy", null);
__decorate([
    (0, common_1.Get)('consents'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PrivacyController.prototype, "getConsents", null);
__decorate([
    (0, common_1.Post)('consents'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, log_consent_dto_1.LogConsentDto]),
    __metadata("design:returntype", void 0)
], PrivacyController.prototype, "logConsent", null);
__decorate([
    (0, common_1.Patch)('consents/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, update_consent_status_dto_1.UpdateConsentStatusDto]),
    __metadata("design:returntype", Promise)
], PrivacyController.prototype, "updateConsent", null);
__decorate([
    (0, common_1.Post)('consents/sync-preferences'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, sync_cookie_preferences_dto_1.SyncCookiePreferencesDto]),
    __metadata("design:returntype", void 0)
], PrivacyController.prototype, "syncCookiePreferences", null);
__decorate([
    (0, common_1.Get)('consents/preferences/:userId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PrivacyController.prototype, "getCookiePreferences", null);
__decorate([
    (0, common_1.Get)('dsar'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PrivacyController.prototype, "listDsar", null);
__decorate([
    (0, common_1.Post)('dsar/access'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_dsar_request_dto_1.CreateDsarRequestDto]),
    __metadata("design:returntype", void 0)
], PrivacyController.prototype, "requestAccess", null);
__decorate([
    (0, common_1.Post)('dsar/rectification'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_dsar_request_dto_1.CreateDsarRequestDto]),
    __metadata("design:returntype", void 0)
], PrivacyController.prototype, "requestRectification", null);
__decorate([
    (0, common_1.Post)('dsar/erasure'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_dsar_request_dto_1.CreateDsarRequestDto]),
    __metadata("design:returntype", void 0)
], PrivacyController.prototype, "requestErasure", null);
__decorate([
    (0, common_1.Patch)('dsar/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, resolve_dsar_request_dto_1.ResolveDsarRequestDto]),
    __metadata("design:returntype", void 0)
], PrivacyController.prototype, "resolveDsar", null);
__decorate([
    (0, common_1.Post)('jobs/run-retention-sweep'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)('actor')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PrivacyController.prototype, "runRetentionSweep", null);
__decorate([
    (0, common_1.Get)('audits'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(100), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], PrivacyController.prototype, "getAuditLogs", null);
exports.PrivacyController = PrivacyController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('privacy'),
    __metadata("design:paramtypes", [privacy_service_1.PrivacyService])
], PrivacyController);
//# sourceMappingURL=privacy.controller.js.map