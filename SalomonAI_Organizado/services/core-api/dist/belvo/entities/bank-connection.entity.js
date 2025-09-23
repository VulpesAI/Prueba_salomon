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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankConnection = void 0;
const typeorm_1 = require("typeorm");
let BankConnection = class BankConnection {
    get isHealthy() {
        return this.status === 'active' && this.errorCount < 5;
    }
    get needsSync() {
        if (!this.autoSyncEnabled || !this.isHealthy)
            return false;
        const lastSync = this.lastSyncAt || this.createdAt;
        const hoursSinceLastSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
        return hoursSinceLastSync >= this.syncFrequencyHours;
    }
    incrementErrorCount(error) {
        this.errorCount += 1;
        this.lastError = error;
        if (this.errorCount >= 5) {
            this.autoSyncEnabled = false;
        }
    }
    resetErrorCount() {
        this.errorCount = 0;
        this.lastError = null;
        this.autoSyncEnabled = true;
    }
    updateSyncResults(accountsSynced, transactionsSynced, errors) {
        this.lastSyncAt = new Date();
        this.metadata = {
            ...this.metadata,
            lastSyncResults: {
                accountsSynced,
                transactionsSynced,
                errors,
            },
        };
        if (errors && errors.length > 0) {
            this.incrementErrorCount(errors.join('; '));
        }
        else {
            this.resetErrorCount();
        }
    }
};
exports.BankConnection = BankConnection;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BankConnection.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'belvo_link_id', unique: true }),
    __metadata("design:type", String)
], BankConnection.prototype, "belvoLinkId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'institution_name' }),
    __metadata("design:type", String)
], BankConnection.prototype, "institutionName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'institution_id' }),
    __metadata("design:type", String)
], BankConnection.prototype, "institutionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'institution_type' }),
    __metadata("design:type", String)
], BankConnection.prototype, "institutionType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'access_mode', default: 'single' }),
    __metadata("design:type", String)
], BankConnection.prototype, "accessMode", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['active', 'invalid', 'unconfirmed', 'token_refresh'],
        default: 'active'
    }),
    __metadata("design:type", String)
], BankConnection.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_accessed_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], BankConnection.prototype, "lastAccessedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'accounts_count', default: 0 }),
    __metadata("design:type", Number)
], BankConnection.prototype, "accountsCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_sync_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], BankConnection.prototype, "lastSyncAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sync_frequency_hours', default: 24 }),
    __metadata("design:type", Number)
], BankConnection.prototype, "syncFrequencyHours", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'auto_sync_enabled', default: true }),
    __metadata("design:type", Boolean)
], BankConnection.prototype, "autoSyncEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { nullable: true }),
    __metadata("design:type", Object)
], BankConnection.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)('simple-array', { default: [] }),
    __metadata("design:type", Array)
], BankConnection.prototype, "connectedAccounts", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', default: true }),
    __metadata("design:type", Boolean)
], BankConnection.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'error_count', default: 0 }),
    __metadata("design:type", Number)
], BankConnection.prototype, "errorCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_error', type: 'text', nullable: true }),
    __metadata("design:type", String)
], BankConnection.prototype, "lastError", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id' }),
    __metadata("design:type", String)
], BankConnection.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], BankConnection.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], BankConnection.prototype, "updatedAt", void 0);
exports.BankConnection = BankConnection = __decorate([
    (0, typeorm_1.Entity)('bank_connections')
], BankConnection);
//# sourceMappingURL=bank-connection.entity.js.map