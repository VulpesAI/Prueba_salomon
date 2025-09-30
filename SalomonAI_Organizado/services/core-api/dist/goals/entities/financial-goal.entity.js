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
exports.FinancialGoal = exports.GOAL_STATUS_VALUES = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const goal_progress_entity_1 = require("./goal-progress.entity");
exports.GOAL_STATUS_VALUES = ['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'];
let FinancialGoal = class FinancialGoal {
};
exports.FinancialGoal = FinancialGoal;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], FinancialGoal.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'user_id' }),
    __metadata("design:type", String)
], FinancialGoal.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, user => user.goals, { onDelete: 'CASCADE' }),
    __metadata("design:type", user_entity_1.User)
], FinancialGoal.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 150 }),
    __metadata("design:type", String)
], FinancialGoal.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], FinancialGoal.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], FinancialGoal.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, name: 'target_amount' }),
    __metadata("design:type", Number)
], FinancialGoal.prototype, "targetAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        name: 'initial_amount',
        default: 0,
    }),
    __metadata("design:type", Number)
], FinancialGoal.prototype, "initialAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        name: 'expected_monthly_contribution',
        nullable: true,
    }),
    __metadata("design:type", Number)
], FinancialGoal.prototype, "expectedMonthlyContribution", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'decimal',
        precision: 5,
        scale: 4,
        name: 'deviation_threshold',
        default: 0.15,
    }),
    __metadata("design:type", Number)
], FinancialGoal.prototype, "deviationThreshold", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'ACTIVE' }),
    __metadata("design:type", String)
], FinancialGoal.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'start_date' }),
    __metadata("design:type", Date)
], FinancialGoal.prototype, "startDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'target_date' }),
    __metadata("design:type", Date)
], FinancialGoal.prototype, "targetDate", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => goal_progress_entity_1.GoalProgress, progress => progress.goal),
    __metadata("design:type", Array)
], FinancialGoal.prototype, "progressEntries", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], FinancialGoal.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], FinancialGoal.prototype, "updatedAt", void 0);
exports.FinancialGoal = FinancialGoal = __decorate([
    (0, typeorm_1.Entity)('financial_goals'),
    (0, typeorm_1.Index)(['userId', 'status'])
], FinancialGoal);
//# sourceMappingURL=financial-goal.entity.js.map