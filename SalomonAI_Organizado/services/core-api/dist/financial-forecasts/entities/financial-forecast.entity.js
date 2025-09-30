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
exports.FinancialForecast = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
let FinancialForecast = class FinancialForecast {
};
exports.FinancialForecast = FinancialForecast;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], FinancialForecast.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: false, onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], FinancialForecast.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'forecast_date', type: 'date', nullable: false }),
    __metadata("design:type", Date)
], FinancialForecast.prototype, "forecastDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'predicted_value', type: 'decimal', precision: 14, scale: 2, nullable: false }),
    __metadata("design:type", Number)
], FinancialForecast.prototype, "predictedValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'model_type', type: 'varchar', length: 20, default: 'auto' }),
    __metadata("design:type", String)
], FinancialForecast.prototype, "modelType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'horizon_days', type: 'int', default: 30 }),
    __metadata("design:type", Number)
], FinancialForecast.prototype, "horizonDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'generated_at', type: 'timestamptz', nullable: false }),
    __metadata("design:type", Date)
], FinancialForecast.prototype, "generatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], FinancialForecast.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], FinancialForecast.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], FinancialForecast.prototype, "updatedAt", void 0);
exports.FinancialForecast = FinancialForecast = __decorate([
    (0, typeorm_1.Entity)('financial_forecasts'),
    (0, typeorm_1.Index)(['user', 'forecastDate'])
], FinancialForecast);
//# sourceMappingURL=financial-forecast.entity.js.map