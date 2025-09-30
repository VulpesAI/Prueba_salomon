import { PrivacyService } from './privacy.service';
import { CreateDataInventoryDto } from './dto/create-data-inventory.dto';
import { UpdateDataInventoryStatusDto } from './dto/update-data-inventory-status.dto';
import { CreateRetentionPolicyDto } from './dto/create-retention-policy.dto';
import { UpdateRetentionPolicyDto } from './dto/update-retention-policy.dto';
import { LogConsentDto } from './dto/log-consent.dto';
import { UpdateConsentStatusDto } from './dto/update-consent-status.dto';
import { SyncCookiePreferencesDto } from './dto/sync-cookie-preferences.dto';
import { CreateDsarRequestDto } from './dto/create-dsar-request.dto';
import { ResolveDsarRequestDto } from './dto/resolve-dsar-request.dto';
import { DataInventoryStatus } from './entities/data-inventory.entity';
import { User } from '../users/entities/user.entity';
export declare class PrivacyController {
    private readonly privacyService;
    constructor(privacyService: PrivacyService);
    private isPrivacyAdmin;
    private ensurePrivacyAdmin;
    private resolveActor;
    getInventory(req: {
        user: User;
    }, dataSubjectId?: string, dataCategory?: string, status?: DataInventoryStatus): Promise<import("./entities/data-inventory.entity").DataInventory[]>;
    createInventory(req: {
        user: User;
    }, dto: CreateDataInventoryDto): Promise<import("./entities/data-inventory.entity").DataInventory>;
    updateInventoryStatus(id: string, req: {
        user: User;
    }, dto: UpdateDataInventoryStatusDto): Promise<import("./entities/data-inventory.entity").DataInventory>;
    getRetentionPolicies(req: {
        user: User;
    }): Promise<import("./entities/retention-policy.entity").RetentionPolicy[]>;
    createRetentionPolicy(req: {
        user: User;
    }, dto: CreateRetentionPolicyDto): Promise<import("./entities/retention-policy.entity").RetentionPolicy>;
    updateRetentionPolicy(id: string, req: {
        user: User;
    }, dto: UpdateRetentionPolicyDto): Promise<import("./entities/retention-policy.entity").RetentionPolicy>;
    getConsents(req: {
        user: User;
    }, userId?: string): Promise<import("./entities/consent-log.entity").ConsentLog[]>;
    logConsent(req: {
        user: User;
    }, dto: LogConsentDto): Promise<import("./entities/consent-log.entity").ConsentLog>;
    updateConsent(id: string, req: {
        user: User;
    }, dto: UpdateConsentStatusDto): Promise<import("./entities/consent-log.entity").ConsentLog>;
    syncCookiePreferences(req: {
        user: User;
    }, dto: SyncCookiePreferencesDto): Promise<import("./entities/cookie-preference.entity").CookiePreference>;
    getCookiePreferences(req: {
        user: User;
    }, userId: string): Promise<import("./entities/cookie-preference.entity").CookiePreference>;
    listDsar(req: {
        user: User;
    }, userId?: string): Promise<import("./entities/dsar-request.entity").DsarRequest[]>;
    requestAccess(req: {
        user: User;
    }, dto: CreateDsarRequestDto): Promise<import("./entities/dsar-request.entity").DsarRequest>;
    requestRectification(req: {
        user: User;
    }, dto: CreateDsarRequestDto): Promise<import("./entities/dsar-request.entity").DsarRequest>;
    requestErasure(req: {
        user: User;
    }, dto: CreateDsarRequestDto): Promise<import("./entities/dsar-request.entity").DsarRequest>;
    resolveDsar(id: string, req: {
        user: User;
    }, dto: ResolveDsarRequestDto): Promise<import("./entities/dsar-request.entity").DsarRequest>;
    runRetentionSweep(req: {
        user: User;
    }, actor?: string): Promise<void>;
    getAuditLogs(req: {
        user: User;
    }, limit: number): Promise<import("./entities/privacy-audit-log.entity").PrivacyAuditLog[]>;
}
