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
var PrivacyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrivacyService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const cookie_preference_entity_1 = require("./entities/cookie-preference.entity");
const consent_log_entity_1 = require("./entities/consent-log.entity");
const data_inventory_entity_1 = require("./entities/data-inventory.entity");
const dsar_request_entity_1 = require("./entities/dsar-request.entity");
const retention_policy_entity_1 = require("./entities/retention-policy.entity");
const privacy_audit_log_entity_1 = require("./entities/privacy-audit-log.entity");
let PrivacyService = PrivacyService_1 = class PrivacyService {
    constructor(dataInventoryRepository, retentionPolicyRepository, consentLogRepository, dsarRequestRepository, cookiePreferenceRepository, privacyAuditRepository) {
        this.dataInventoryRepository = dataInventoryRepository;
        this.retentionPolicyRepository = retentionPolicyRepository;
        this.consentLogRepository = consentLogRepository;
        this.dsarRequestRepository = dsarRequestRepository;
        this.cookiePreferenceRepository = cookiePreferenceRepository;
        this.privacyAuditRepository = privacyAuditRepository;
        this.logger = new common_1.Logger(PrivacyService_1.name);
    }
    async getDataInventory(filters = {}) {
        const where = {};
        if (filters.dataSubjectId) {
            where.dataSubjectId = filters.dataSubjectId;
        }
        if (filters.dataCategory) {
            where.dataCategory = filters.dataCategory;
        }
        if (filters.status) {
            where.status = filters.status;
        }
        return this.dataInventoryRepository.find({
            where,
            order: { collectedAt: 'DESC' },
        });
    }
    async createDataInventory(dto) {
        const entry = this.dataInventoryRepository.create({
            dataSubjectId: dto.dataSubjectId,
            dataCategory: dto.dataCategory,
            sourceSystem: dto.sourceSystem,
            collectedAt: new Date(dto.collectedAt),
            retentionPeriodDays: dto.retentionPeriodDays,
            metadata: dto.metadata ?? null,
        });
        const saved = await this.dataInventoryRepository.save(entry);
        await this.recordAudit('data_inventory.created', dto.requestedBy ?? 'api', {
            entryId: saved.id,
            dataSubjectId: saved.dataSubjectId,
            dataCategory: saved.dataCategory,
        });
        return saved;
    }
    async updateDataInventoryStatus(id, dto) {
        const entry = await this.dataInventoryRepository.findOne({ where: { id } });
        if (!entry) {
            throw new common_1.NotFoundException(`Data inventory entry ${id} not found`);
        }
        entry.status = dto.status;
        if (dto.status === data_inventory_entity_1.DataInventoryStatus.ANONYMIZED) {
            entry.metadata = {};
            entry.anonymizedAt = new Date();
            entry.purgedAt = null;
        }
        if (dto.status === data_inventory_entity_1.DataInventoryStatus.PURGED) {
            entry.metadata = null;
            entry.purgedAt = new Date();
        }
        if (dto.status === data_inventory_entity_1.DataInventoryStatus.ACTIVE) {
            entry.anonymizedAt = null;
            entry.purgedAt = null;
        }
        const saved = await this.dataInventoryRepository.save(entry);
        await this.recordAudit('data_inventory.status_updated', dto.requestedBy ?? 'api', {
            entryId: saved.id,
            status: saved.status,
            reason: dto.reason,
        });
        return saved;
    }
    async createRetentionPolicy(dto) {
        const policy = this.retentionPolicyRepository.create({
            dataCategory: dto.dataCategory,
            retentionPeriodDays: dto.retentionPeriodDays,
            gracePeriodDays: dto.gracePeriodDays ?? 0,
            action: dto.action ?? retention_policy_entity_1.RetentionPolicyAction.ANONYMIZE,
            legalBasis: dto.legalBasis,
        });
        const saved = await this.retentionPolicyRepository.save(policy);
        await this.recordAudit('retention_policy.created', dto.requestedBy ?? 'api', {
            policyId: saved.id,
            dataCategory: saved.dataCategory,
            action: saved.action,
        });
        return saved;
    }
    async updateRetentionPolicy(id, dto) {
        const policy = await this.retentionPolicyRepository.findOne({ where: { id } });
        if (!policy) {
            throw new common_1.NotFoundException(`Retention policy ${id} not found`);
        }
        if (dto.retentionPeriodDays !== undefined) {
            policy.retentionPeriodDays = dto.retentionPeriodDays;
        }
        if (dto.gracePeriodDays !== undefined) {
            policy.gracePeriodDays = dto.gracePeriodDays;
        }
        if (dto.action) {
            policy.action = dto.action;
        }
        if (dto.legalBasis !== undefined) {
            policy.legalBasis = dto.legalBasis;
        }
        const saved = await this.retentionPolicyRepository.save(policy);
        await this.recordAudit('retention_policy.updated', dto.requestedBy ?? 'api', {
            policyId: saved.id,
        });
        return saved;
    }
    async getRetentionPolicies() {
        return this.retentionPolicyRepository.find({ order: { dataCategory: 'ASC' } });
    }
    async logConsent(dto) {
        if (!dto.userId) {
            throw new common_1.BadRequestException('Debe especificarse el usuario para registrar el consentimiento.');
        }
        const consent = this.consentLogRepository.create({
            userId: dto.userId,
            consentType: dto.consentType,
            granted: dto.granted ?? true,
            channel: dto.channel,
            version: dto.version,
            metadata: dto.metadata ?? null,
            revokedAt: dto.granted === false ? new Date() : null,
        });
        const saved = await this.consentLogRepository.save(consent);
        await this.recordAudit('consent.log_created', dto.requestedBy ?? 'api', {
            consentId: saved.id,
            userId: saved.userId,
            consentType: saved.consentType,
            granted: saved.granted,
        });
        return saved;
    }
    async updateConsentStatus(id, dto) {
        const consent = await this.consentLogRepository.findOne({ where: { id } });
        if (!consent) {
            throw new common_1.NotFoundException(`Consent log ${id} not found`);
        }
        if (dto.granted !== undefined) {
            consent.granted = dto.granted;
            consent.revokedAt = dto.granted ? null : new Date();
        }
        if (dto.version !== undefined) {
            consent.version = dto.version;
        }
        const saved = await this.consentLogRepository.save(consent);
        await this.recordAudit('consent.log_updated', dto.requestedBy ?? 'api', {
            consentId: saved.id,
            granted: saved.granted,
            reason: dto.reason,
        });
        return saved;
    }
    async getConsentLogs(userId) {
        const where = userId ? { userId } : {};
        return this.consentLogRepository.find({
            where,
            order: { recordedAt: 'DESC' },
        });
    }
    async getConsentLogById(id) {
        return this.consentLogRepository.findOne({ where: { id } });
    }
    async syncCookiePreferences(dto) {
        if (!dto.userId) {
            throw new common_1.BadRequestException('Debe especificarse el usuario para sincronizar preferencias de cookies.');
        }
        let preference = await this.cookiePreferenceRepository.findOne({
            where: { userId: dto.userId },
        });
        if (!preference) {
            preference = this.cookiePreferenceRepository.create({
                userId: dto.userId,
                preferences: dto.preferences,
                source: dto.source,
            });
        }
        else {
            preference.preferences = dto.preferences;
            preference.source = dto.source ?? preference.source;
        }
        const saved = await this.cookiePreferenceRepository.save(preference);
        await this.recordAudit('cookie_preferences.synced', dto.requestedBy ?? 'api', {
            userId: saved.userId,
            source: dto.source,
        });
        return saved;
    }
    async getCookiePreferences(userId) {
        return this.cookiePreferenceRepository.findOne({ where: { userId } });
    }
    async listDsarRequests(userId) {
        const where = userId ? { userId } : {};
        return this.dsarRequestRepository.find({
            where,
            order: { requestedAt: 'DESC' },
        });
    }
    async requestAccess(dto) {
        if (!dto.userId) {
            throw new common_1.BadRequestException('No se indicó el usuario que solicita el acceso a datos.');
        }
        const request = await this.dsarRequestRepository.save(this.dsarRequestRepository.create({
            userId: dto.userId,
            type: dsar_request_entity_1.DsarRequestType.ACCESS,
            requestedBy: dto.requestedBy,
            status: dsar_request_entity_1.DsarRequestStatus.IN_PROGRESS,
            payload: dto.payload ?? {},
        }));
        const inventory = await this.getDataInventory({ dataSubjectId: dto.userId });
        const inventorySnapshot = inventory.map((item) => ({
            id: item.id,
            category: item.dataCategory,
            collectedAt: item.collectedAt,
            status: item.status,
            sourceSystem: item.sourceSystem,
        }));
        request.payload = {
            ...(request.payload ?? {}),
            inventorySnapshot,
        };
        request.status = dsar_request_entity_1.DsarRequestStatus.COMPLETED;
        request.completedAt = new Date();
        request.resolutionNotes = `Se generaron ${inventorySnapshot.length} registros para descarga.`;
        const saved = await this.dsarRequestRepository.save(request);
        await this.recordAudit('dsar.access.completed', dto.requestedBy ?? 'api', {
            requestId: saved.id,
            userId: dto.userId,
            records: inventorySnapshot.length,
        });
        return saved;
    }
    async requestRectification(dto) {
        if (!dto.userId) {
            throw new common_1.BadRequestException('No se indicó el usuario que solicita la rectificación.');
        }
        const request = await this.dsarRequestRepository.save(this.dsarRequestRepository.create({
            userId: dto.userId,
            type: dsar_request_entity_1.DsarRequestType.RECTIFICATION,
            requestedBy: dto.requestedBy,
            status: dsar_request_entity_1.DsarRequestStatus.IN_PROGRESS,
            payload: dto.payload ?? {},
        }));
        const metadataUpdates = dto.payload?.metadataUpdates;
        let updatedRecords = 0;
        if (metadataUpdates) {
            const inventory = await this.dataInventoryRepository.find({
                where: { dataSubjectId: dto.userId, status: (0, typeorm_2.Not)(data_inventory_entity_1.DataInventoryStatus.PURGED) },
            });
            for (const item of inventory) {
                item.metadata = {
                    ...(item.metadata ?? {}),
                    ...metadataUpdates,
                };
                await this.dataInventoryRepository.save(item);
                updatedRecords += 1;
            }
        }
        request.status = dsar_request_entity_1.DsarRequestStatus.COMPLETED;
        request.completedAt = new Date();
        request.resolutionNotes = metadataUpdates
            ? `Rectificación aplicada a ${updatedRecords} registros.`
            : 'No se encontraron cambios para aplicar.';
        const saved = await this.dsarRequestRepository.save(request);
        await this.recordAudit('dsar.rectification.completed', dto.requestedBy ?? 'api', {
            requestId: saved.id,
            userId: dto.userId,
            updatedRecords,
        });
        return saved;
    }
    async requestErasure(dto) {
        if (!dto.userId) {
            throw new common_1.BadRequestException('No se indicó el usuario que solicita el derecho al olvido.');
        }
        const request = await this.dsarRequestRepository.save(this.dsarRequestRepository.create({
            userId: dto.userId,
            type: dsar_request_entity_1.DsarRequestType.ERASURE,
            requestedBy: dto.requestedBy,
            status: dsar_request_entity_1.DsarRequestStatus.IN_PROGRESS,
            payload: dto.payload ?? {},
        }));
        const entries = await this.dataInventoryRepository.find({
            where: { dataSubjectId: dto.userId },
        });
        let purgedRecords = 0;
        for (const entry of entries) {
            await this.purgeDataEntry(entry, dto.requestedBy ?? 'api', {
                reason: 'dsar_erasure',
            });
            purgedRecords += 1;
        }
        request.status = dsar_request_entity_1.DsarRequestStatus.COMPLETED;
        request.completedAt = new Date();
        request.resolutionNotes = `Se purgaron ${purgedRecords} registros.`;
        const saved = await this.dsarRequestRepository.save(request);
        await this.recordAudit('dsar.erasure.completed', dto.requestedBy ?? 'api', {
            requestId: saved.id,
            userId: dto.userId,
            purgedRecords,
        });
        return saved;
    }
    async resolveDsarRequest(id, dto) {
        const request = await this.dsarRequestRepository.findOne({ where: { id } });
        if (!request) {
            throw new common_1.NotFoundException(`DSAR request ${id} not found`);
        }
        request.status = dto.status;
        request.resolutionNotes = dto.resolutionNotes ?? request.resolutionNotes;
        request.payload = {
            ...(request.payload ?? {}),
            ...(dto.payload ?? {}),
        };
        request.completedAt =
            dto.status === dsar_request_entity_1.DsarRequestStatus.COMPLETED ? new Date() : request.completedAt;
        request.completedBy = dto.completedBy ?? request.completedBy;
        const saved = await this.dsarRequestRepository.save(request);
        await this.recordAudit('dsar.updated', dto.completedBy ?? 'api', {
            requestId: saved.id,
            status: saved.status,
        });
        return saved;
    }
    async getAuditLogs(limit = 100) {
        return this.privacyAuditRepository.find({
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }
    async handleAutomatedRetentionSweep() {
        this.logger.log('Iniciando revisión automática de retención de datos');
        await this.processRetentionSweep('automated-job');
    }
    async processRetentionSweep(actor) {
        const policies = await this.retentionPolicyRepository.find();
        const now = Date.now();
        for (const policy of policies) {
            const retentionWindowDays = policy.retentionPeriodDays + (policy.gracePeriodDays ?? 0);
            const threshold = new Date(now - retentionWindowDays * 24 * 60 * 60 * 1000);
            const staleEntries = await this.dataInventoryRepository.find({
                where: {
                    dataCategory: policy.dataCategory,
                    collectedAt: (0, typeorm_2.LessThan)(threshold),
                    status: (0, typeorm_2.Not)(data_inventory_entity_1.DataInventoryStatus.PURGED),
                },
            });
            for (const entry of staleEntries) {
                if (policy.action === retention_policy_entity_1.RetentionPolicyAction.DELETE) {
                    await this.purgeDataEntry(entry, actor, {
                        reason: 'retention_policy',
                        policyId: policy.id,
                    });
                }
                else {
                    await this.anonymizeDataEntry(entry, actor, {
                        reason: 'retention_policy',
                        policyId: policy.id,
                    });
                }
            }
        }
    }
    async anonymizeDataEntry(entry, actor, context = {}) {
        if (entry.status === data_inventory_entity_1.DataInventoryStatus.PURGED) {
            return;
        }
        entry.metadata = {};
        entry.status = data_inventory_entity_1.DataInventoryStatus.ANONYMIZED;
        entry.anonymizedAt = new Date();
        entry.purgedAt = null;
        await this.dataInventoryRepository.save(entry);
        await this.recordAudit('data_inventory.anonymized', actor, {
            entryId: entry.id,
            ...context,
        });
    }
    async purgeDataEntry(entry, actor, context = {}) {
        if (entry.status === data_inventory_entity_1.DataInventoryStatus.PURGED) {
            return;
        }
        entry.metadata = null;
        entry.status = data_inventory_entity_1.DataInventoryStatus.PURGED;
        entry.purgedAt = new Date();
        await this.dataInventoryRepository.save(entry);
        await this.recordAudit('data_inventory.purged', actor, {
            entryId: entry.id,
            dataSubjectId: entry.dataSubjectId,
            dataCategory: entry.dataCategory,
            ...context,
        });
    }
    async recordAudit(action, actor, details, actorRole = 'system') {
        const entry = this.privacyAuditRepository.create({
            action,
            actor,
            actorRole,
            details: details ?? null,
        });
        await this.privacyAuditRepository.save(entry);
    }
};
exports.PrivacyService = PrivacyService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_2AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PrivacyService.prototype, "handleAutomatedRetentionSweep", null);
exports.PrivacyService = PrivacyService = PrivacyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(data_inventory_entity_1.DataInventory)),
    __param(1, (0, typeorm_1.InjectRepository)(retention_policy_entity_1.RetentionPolicy)),
    __param(2, (0, typeorm_1.InjectRepository)(consent_log_entity_1.ConsentLog)),
    __param(3, (0, typeorm_1.InjectRepository)(dsar_request_entity_1.DsarRequest)),
    __param(4, (0, typeorm_1.InjectRepository)(cookie_preference_entity_1.CookiePreference)),
    __param(5, (0, typeorm_1.InjectRepository)(privacy_audit_log_entity_1.PrivacyAuditLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], PrivacyService);
//# sourceMappingURL=privacy.service.js.map