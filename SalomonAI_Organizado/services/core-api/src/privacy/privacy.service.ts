import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Not, Repository } from 'typeorm';
import {
  CookiePreference,
} from './entities/cookie-preference.entity';
import { ConsentLog } from './entities/consent-log.entity';
import { DataInventory, DataInventoryStatus } from './entities/data-inventory.entity';
import {
  DsarRequest,
  DsarRequestStatus,
  DsarRequestType,
} from './entities/dsar-request.entity';
import {
  RetentionPolicy,
  RetentionPolicyAction,
} from './entities/retention-policy.entity';
import { PrivacyAuditLog } from './entities/privacy-audit-log.entity';
import { CreateDataInventoryDto } from './dto/create-data-inventory.dto';
import { UpdateDataInventoryStatusDto } from './dto/update-data-inventory-status.dto';
import { CreateRetentionPolicyDto } from './dto/create-retention-policy.dto';
import { UpdateRetentionPolicyDto } from './dto/update-retention-policy.dto';
import { LogConsentDto } from './dto/log-consent.dto';
import { UpdateConsentStatusDto } from './dto/update-consent-status.dto';
import { CreateDsarRequestDto } from './dto/create-dsar-request.dto';
import { ResolveDsarRequestDto } from './dto/resolve-dsar-request.dto';
import { SyncCookiePreferencesDto } from './dto/sync-cookie-preferences.dto';

interface InventoryFilters {
  dataSubjectId?: string;
  dataCategory?: string;
  status?: DataInventoryStatus;
}

@Injectable()
export class PrivacyService {
  private readonly logger = new Logger(PrivacyService.name);

  constructor(
    @InjectRepository(DataInventory)
    private readonly dataInventoryRepository: Repository<DataInventory>,
    @InjectRepository(RetentionPolicy)
    private readonly retentionPolicyRepository: Repository<RetentionPolicy>,
    @InjectRepository(ConsentLog)
    private readonly consentLogRepository: Repository<ConsentLog>,
    @InjectRepository(DsarRequest)
    private readonly dsarRequestRepository: Repository<DsarRequest>,
    @InjectRepository(CookiePreference)
    private readonly cookiePreferenceRepository: Repository<CookiePreference>,
    @InjectRepository(PrivacyAuditLog)
    private readonly privacyAuditRepository: Repository<PrivacyAuditLog>,
  ) {}

  async getDataInventory(filters: InventoryFilters = {}): Promise<DataInventory[]> {
    const where: Record<string, unknown> = {};
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

  async createDataInventory(dto: CreateDataInventoryDto): Promise<DataInventory> {
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

  async updateDataInventoryStatus(
    id: string,
    dto: UpdateDataInventoryStatusDto,
  ): Promise<DataInventory> {
    const entry = await this.dataInventoryRepository.findOne({ where: { id } });
    if (!entry) {
      throw new NotFoundException(`Data inventory entry ${id} not found`);
    }

    entry.status = dto.status;
    if (dto.status === DataInventoryStatus.ANONYMIZED) {
      entry.metadata = {};
    }

    const saved = await this.dataInventoryRepository.save(entry);
    await this.recordAudit('data_inventory.status_updated', dto.requestedBy ?? 'api', {
      entryId: saved.id,
      status: saved.status,
      reason: dto.reason,
    });
    return saved;
  }

  async createRetentionPolicy(dto: CreateRetentionPolicyDto): Promise<RetentionPolicy> {
    const policy = this.retentionPolicyRepository.create({
      dataCategory: dto.dataCategory,
      retentionPeriodDays: dto.retentionPeriodDays,
      gracePeriodDays: dto.gracePeriodDays ?? 0,
      action: dto.action ?? RetentionPolicyAction.ANONYMIZE,
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

  async updateRetentionPolicy(
    id: string,
    dto: UpdateRetentionPolicyDto,
  ): Promise<RetentionPolicy> {
    const policy = await this.retentionPolicyRepository.findOne({ where: { id } });
    if (!policy) {
      throw new NotFoundException(`Retention policy ${id} not found`);
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

  async getRetentionPolicies(): Promise<RetentionPolicy[]> {
    return this.retentionPolicyRepository.find({ order: { dataCategory: 'ASC' } });
  }

  async logConsent(dto: LogConsentDto): Promise<ConsentLog> {
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

  async updateConsentStatus(id: string, dto: UpdateConsentStatusDto): Promise<ConsentLog> {
    const consent = await this.consentLogRepository.findOne({ where: { id } });
    if (!consent) {
      throw new NotFoundException(`Consent log ${id} not found`);
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

  async getConsentLogs(userId?: string): Promise<ConsentLog[]> {
    const where = userId ? { userId } : {};
    return this.consentLogRepository.find({
      where,
      order: { recordedAt: 'DESC' },
    });
  }

  async syncCookiePreferences(dto: SyncCookiePreferencesDto): Promise<CookiePreference> {
    let preference = await this.cookiePreferenceRepository.findOne({
      where: { userId: dto.userId },
    });

    if (!preference) {
      preference = this.cookiePreferenceRepository.create({
        userId: dto.userId,
        preferences: dto.preferences,
        source: dto.source,
      });
    } else {
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

  async getCookiePreferences(userId: string): Promise<CookiePreference | null> {
    return this.cookiePreferenceRepository.findOne({ where: { userId } });
  }

  async listDsarRequests(userId?: string): Promise<DsarRequest[]> {
    const where = userId ? { userId } : {};
    return this.dsarRequestRepository.find({
      where,
      order: { requestedAt: 'DESC' },
    });
  }

  async requestAccess(dto: CreateDsarRequestDto): Promise<DsarRequest> {
    const request = await this.dsarRequestRepository.save(
      this.dsarRequestRepository.create({
        userId: dto.userId,
        type: DsarRequestType.ACCESS,
        requestedBy: dto.requestedBy,
        status: DsarRequestStatus.IN_PROGRESS,
        payload: dto.payload ?? {},
      }),
    );

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
    request.status = DsarRequestStatus.COMPLETED;
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

  async requestRectification(dto: CreateDsarRequestDto): Promise<DsarRequest> {
    const request = await this.dsarRequestRepository.save(
      this.dsarRequestRepository.create({
        userId: dto.userId,
        type: DsarRequestType.RECTIFICATION,
        requestedBy: dto.requestedBy,
        status: DsarRequestStatus.IN_PROGRESS,
        payload: dto.payload ?? {},
      }),
    );

    const metadataUpdates = dto.payload?.metadataUpdates as
      | Record<string, any>
      | undefined;
    let updatedRecords = 0;

    if (metadataUpdates) {
      const inventory = await this.dataInventoryRepository.find({
        where: { dataSubjectId: dto.userId, status: Not(DataInventoryStatus.PURGED) },
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

    request.status = DsarRequestStatus.COMPLETED;
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

  async requestErasure(dto: CreateDsarRequestDto): Promise<DsarRequest> {
    const request = await this.dsarRequestRepository.save(
      this.dsarRequestRepository.create({
        userId: dto.userId,
        type: DsarRequestType.ERASURE,
        requestedBy: dto.requestedBy,
        status: DsarRequestStatus.IN_PROGRESS,
        payload: dto.payload ?? {},
      }),
    );

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

    request.status = DsarRequestStatus.COMPLETED;
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

  async resolveDsarRequest(id: string, dto: ResolveDsarRequestDto): Promise<DsarRequest> {
    const request = await this.dsarRequestRepository.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException(`DSAR request ${id} not found`);
    }

    request.status = dto.status;
    request.resolutionNotes = dto.resolutionNotes ?? request.resolutionNotes;
    request.payload = {
      ...(request.payload ?? {}),
      ...(dto.payload ?? {}),
    };
    request.completedAt =
      dto.status === DsarRequestStatus.COMPLETED ? new Date() : request.completedAt;
    request.completedBy = dto.completedBy ?? request.completedBy;

    const saved = await this.dsarRequestRepository.save(request);
    await this.recordAudit('dsar.updated', dto.completedBy ?? 'api', {
      requestId: saved.id,
      status: saved.status,
    });
    return saved;
  }

  async getAuditLogs(limit = 100): Promise<PrivacyAuditLog[]> {
    return this.privacyAuditRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleAutomatedRetentionSweep(): Promise<void> {
    this.logger.log('Iniciando revisión automática de retención de datos');
    await this.processRetentionSweep('automated-job');
  }

  async processRetentionSweep(actor: string): Promise<void> {
    const policies = await this.retentionPolicyRepository.find();
    const now = Date.now();

    for (const policy of policies) {
      const retentionWindowDays = policy.retentionPeriodDays + (policy.gracePeriodDays ?? 0);
      const threshold = new Date(now - retentionWindowDays * 24 * 60 * 60 * 1000);

      const staleEntries = await this.dataInventoryRepository.find({
        where: {
          dataCategory: policy.dataCategory,
          collectedAt: LessThan(threshold),
          status: Not(DataInventoryStatus.PURGED),
        },
      });

      for (const entry of staleEntries) {
        if (policy.action === RetentionPolicyAction.DELETE) {
          await this.purgeDataEntry(entry, actor, {
            reason: 'retention_policy',
            policyId: policy.id,
          });
        } else {
          await this.anonymizeDataEntry(entry, actor, {
            reason: 'retention_policy',
            policyId: policy.id,
          });
        }
      }
    }
  }

  private async anonymizeDataEntry(
    entry: DataInventory,
    actor: string,
    context: Record<string, any> = {},
  ): Promise<void> {
    if (entry.status === DataInventoryStatus.PURGED) {
      return;
    }

    entry.metadata = {};
    entry.status = DataInventoryStatus.ANONYMIZED;
    await this.dataInventoryRepository.save(entry);
    await this.recordAudit('data_inventory.anonymized', actor, {
      entryId: entry.id,
      ...context,
    });
  }

  private async purgeDataEntry(
    entry: DataInventory,
    actor: string,
    context: Record<string, any> = {},
  ): Promise<void> {
    await this.dataInventoryRepository.remove(entry);
    await this.recordAudit('data_inventory.purged', actor, {
      entryId: entry.id,
      dataSubjectId: entry.dataSubjectId,
      dataCategory: entry.dataCategory,
      ...context,
    });
  }

  private async recordAudit(
    action: string,
    actor: string,
    details?: Record<string, any>,
    actorRole = 'system',
  ): Promise<void> {
    const entry = this.privacyAuditRepository.create({
      action,
      actor,
      actorRole,
      details: details ?? null,
    });
    await this.privacyAuditRepository.save(entry);
  }
}
