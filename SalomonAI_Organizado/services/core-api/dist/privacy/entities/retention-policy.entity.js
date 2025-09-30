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
exports.RetentionPolicy = exports.RetentionPolicyAction = void 0;
const typeorm_1 = require("typeorm");
var RetentionPolicyAction;
(function (RetentionPolicyAction) {
    RetentionPolicyAction["ANONYMIZE"] = "anonymize";
    RetentionPolicyAction["DELETE"] = "delete";
})(RetentionPolicyAction || (exports.RetentionPolicyAction = RetentionPolicyAction = {}));
let RetentionPolicy = class RetentionPolicy {
};
exports.RetentionPolicy = RetentionPolicy;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], RetentionPolicy.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'data_category', type: 'varchar', length: 120, unique: true }),
    __metadata("design:type", String)
], RetentionPolicy.prototype, "dataCategory", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'retention_period_days', type: 'int' }),
    __metadata("design:type", Number)
], RetentionPolicy.prototype, "retentionPeriodDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'grace_period_days', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], RetentionPolicy.prototype, "gracePeriodDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: RetentionPolicyAction, default: RetentionPolicyAction.ANONYMIZE }),
    __metadata("design:type", String)
], RetentionPolicy.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'legal_basis', type: 'text', nullable: true }),
    __metadata("design:type", String)
], RetentionPolicy.prototype, "legalBasis", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], RetentionPolicy.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], RetentionPolicy.prototype, "updatedAt", void 0);
exports.RetentionPolicy = RetentionPolicy = __decorate([
    (0, typeorm_1.Entity)({ name: 'privacy_retention_policies' })
], RetentionPolicy);
//# sourceMappingURL=retention-policy.entity.js.map