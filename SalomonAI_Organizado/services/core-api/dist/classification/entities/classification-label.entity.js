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
exports.ClassificationLabel = exports.ClassificationLabelStatus = exports.ClassificationLabelSource = void 0;
const typeorm_1 = require("typeorm");
var ClassificationLabelSource;
(function (ClassificationLabelSource) {
    ClassificationLabelSource["USER_CORRECTION"] = "USER_CORRECTION";
    ClassificationLabelSource["MANUAL_TRAINING"] = "MANUAL_TRAINING";
    ClassificationLabelSource["SYSTEM_IMPORT"] = "SYSTEM_IMPORT";
})(ClassificationLabelSource || (exports.ClassificationLabelSource = ClassificationLabelSource = {}));
var ClassificationLabelStatus;
(function (ClassificationLabelStatus) {
    ClassificationLabelStatus["PENDING"] = "PENDING";
    ClassificationLabelStatus["QUEUED"] = "QUEUED";
    ClassificationLabelStatus["USED"] = "USED";
})(ClassificationLabelStatus || (exports.ClassificationLabelStatus = ClassificationLabelStatus = {}));
let ClassificationLabel = class ClassificationLabel {
};
exports.ClassificationLabel = ClassificationLabel;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ClassificationLabel.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500 }),
    __metadata("design:type", String)
], ClassificationLabel.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'final_category', type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], ClassificationLabel.prototype, "finalCategory", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'previous_category', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], ClassificationLabel.prototype, "previousCategory", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'movement_id', type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], ClassificationLabel.prototype, "movementId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 250, nullable: true }),
    __metadata("design:type", String)
], ClassificationLabel.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], ClassificationLabel.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, default: ClassificationLabelSource.USER_CORRECTION }),
    __metadata("design:type", String)
], ClassificationLabel.prototype, "source", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 40, default: ClassificationLabelStatus.PENDING }),
    __metadata("design:type", String)
], ClassificationLabel.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'submitted_by', type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], ClassificationLabel.prototype, "submittedBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], ClassificationLabel.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], ClassificationLabel.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'accepted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], ClassificationLabel.prototype, "acceptedAt", void 0);
exports.ClassificationLabel = ClassificationLabel = __decorate([
    (0, typeorm_1.Entity)('classification_labels')
], ClassificationLabel);
//# sourceMappingURL=classification-label.entity.js.map