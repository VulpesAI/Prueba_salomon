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
exports.GoalProgress = void 0;
const typeorm_1 = require("typeorm");
const financial_goal_entity_1 = require("./financial-goal.entity");
let GoalProgress = class GoalProgress {
};
exports.GoalProgress = GoalProgress;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], GoalProgress.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'goal_id' }),
    __metadata("design:type", String)
], GoalProgress.prototype, "goalId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => financial_goal_entity_1.FinancialGoal, goal => goal.progressEntries, { onDelete: 'CASCADE' }),
    __metadata("design:type", financial_goal_entity_1.FinancialGoal)
], GoalProgress.prototype, "goal", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, name: 'actual_amount' }),
    __metadata("design:type", Number)
], GoalProgress.prototype, "actualAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, name: 'expected_amount', nullable: true }),
    __metadata("design:type", Number)
], GoalProgress.prototype, "expectedAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], GoalProgress.prototype, "note", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'recorded_at', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], GoalProgress.prototype, "recordedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], GoalProgress.prototype, "createdAt", void 0);
exports.GoalProgress = GoalProgress = __decorate([
    (0, typeorm_1.Entity)('goal_progress'),
    (0, typeorm_1.Index)(['goalId', 'recordedAt'])
], GoalProgress);
//# sourceMappingURL=goal-progress.entity.js.map