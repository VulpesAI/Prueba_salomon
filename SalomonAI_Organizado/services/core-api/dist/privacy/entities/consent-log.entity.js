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
exports.ConsentLog = void 0;
const typeorm_1 = require("typeorm");
let ConsentLog = class ConsentLog {
};
exports.ConsentLog = ConsentLog;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ConsentLog.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)('idx_privacy_consent_user'),
    (0, typeorm_1.Column)({ name: 'user_id', type: 'varchar', length: 120 }),
    __metadata("design:type", String)
], ConsentLog.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'consent_type', type: 'varchar', length: 120 }),
    __metadata("design:type", String)
], ConsentLog.prototype, "consentType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'granted', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], ConsentLog.prototype, "granted", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'version', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], ConsentLog.prototype, "version", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'channel', type: 'varchar', length: 80, nullable: true }),
    __metadata("design:type", String)
], ConsentLog.prototype, "channel", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'metadata', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], ConsentLog.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'revoked_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], ConsentLog.prototype, "revokedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'recorded_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], ConsentLog.prototype, "recordedAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], ConsentLog.prototype, "updatedAt", void 0);
exports.ConsentLog = ConsentLog = __decorate([
    (0, typeorm_1.Entity)({ name: 'privacy_consent_logs' })
], ConsentLog);
//# sourceMappingURL=consent-log.entity.js.map