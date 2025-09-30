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
exports.DsarRequest = exports.DsarRequestStatus = exports.DsarRequestType = void 0;
const typeorm_1 = require("typeorm");
var DsarRequestType;
(function (DsarRequestType) {
    DsarRequestType["ACCESS"] = "access";
    DsarRequestType["RECTIFICATION"] = "rectification";
    DsarRequestType["ERASURE"] = "erasure";
})(DsarRequestType || (exports.DsarRequestType = DsarRequestType = {}));
var DsarRequestStatus;
(function (DsarRequestStatus) {
    DsarRequestStatus["OPEN"] = "open";
    DsarRequestStatus["IN_PROGRESS"] = "in_progress";
    DsarRequestStatus["COMPLETED"] = "completed";
    DsarRequestStatus["REJECTED"] = "rejected";
})(DsarRequestStatus || (exports.DsarRequestStatus = DsarRequestStatus = {}));
let DsarRequest = class DsarRequest {
};
exports.DsarRequest = DsarRequest;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], DsarRequest.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)('idx_privacy_dsar_user'),
    (0, typeorm_1.Column)({ name: 'user_id', type: 'varchar', length: 120 }),
    __metadata("design:type", String)
], DsarRequest.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: DsarRequestType }),
    __metadata("design:type", String)
], DsarRequest.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: DsarRequestStatus, default: DsarRequestStatus.OPEN }),
    __metadata("design:type", String)
], DsarRequest.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payload', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], DsarRequest.prototype, "payload", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'resolution_notes', type: 'text', nullable: true }),
    __metadata("design:type", String)
], DsarRequest.prototype, "resolutionNotes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'requested_by', type: 'varchar', length: 120, nullable: true }),
    __metadata("design:type", String)
], DsarRequest.prototype, "requestedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'completed_by', type: 'varchar', length: 120, nullable: true }),
    __metadata("design:type", String)
], DsarRequest.prototype, "completedBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'requested_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], DsarRequest.prototype, "requestedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'completed_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], DsarRequest.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], DsarRequest.prototype, "updatedAt", void 0);
exports.DsarRequest = DsarRequest = __decorate([
    (0, typeorm_1.Entity)({ name: 'privacy_dsar_requests' })
], DsarRequest);
//# sourceMappingURL=dsar-request.entity.js.map