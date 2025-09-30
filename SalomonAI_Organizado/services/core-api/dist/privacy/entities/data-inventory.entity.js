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
exports.DataInventory = exports.DataInventoryStatus = void 0;
const typeorm_1 = require("typeorm");
var DataInventoryStatus;
(function (DataInventoryStatus) {
    DataInventoryStatus["ACTIVE"] = "active";
    DataInventoryStatus["ANONYMIZED"] = "anonymized";
    DataInventoryStatus["PURGED"] = "purged";
})(DataInventoryStatus || (exports.DataInventoryStatus = DataInventoryStatus = {}));
let DataInventory = class DataInventory {
};
exports.DataInventory = DataInventory;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], DataInventory.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)('idx_privacy_data_subject'),
    (0, typeorm_1.Column)({ name: 'data_subject_id', type: 'varchar', length: 120 }),
    __metadata("design:type", String)
], DataInventory.prototype, "dataSubjectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'data_category', type: 'varchar', length: 120 }),
    __metadata("design:type", String)
], DataInventory.prototype, "dataCategory", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'source_system', type: 'varchar', length: 120, nullable: true }),
    __metadata("design:type", String)
], DataInventory.prototype, "sourceSystem", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'collected_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], DataInventory.prototype, "collectedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'retention_period_days', type: 'int' }),
    __metadata("design:type", Number)
], DataInventory.prototype, "retentionPeriodDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'metadata', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], DataInventory.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: DataInventoryStatus, default: DataInventoryStatus.ACTIVE }),
    __metadata("design:type", String)
], DataInventory.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'anonymized_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], DataInventory.prototype, "anonymizedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'purged_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], DataInventory.prototype, "purgedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], DataInventory.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], DataInventory.prototype, "updatedAt", void 0);
exports.DataInventory = DataInventory = __decorate([
    (0, typeorm_1.Entity)({ name: 'privacy_data_inventory' })
], DataInventory);
//# sourceMappingURL=data-inventory.entity.js.map