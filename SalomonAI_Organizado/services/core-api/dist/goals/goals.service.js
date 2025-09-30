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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoalsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const financial_goal_entity_1 = require("./entities/financial-goal.entity");
const goal_progress_entity_1 = require("./entities/goal-progress.entity");
const notifications_service_1 = require("../notifications/notifications.service");
const user_service_1 = require("../users/user.service");
let GoalsService = class GoalsService {
    constructor(goalsRepository, progressRepository, notificationsService, userService) {
        this.goalsRepository = goalsRepository;
        this.progressRepository = progressRepository;
        this.notificationsService = notificationsService;
        this.userService = userService;
    }
    async createGoal(userId, dto) {
        const goal = this.goalsRepository.create({
            userId,
            name: dto.name,
            description: dto.description,
            category: dto.category,
            targetAmount: dto.targetAmount,
            initialAmount: dto.initialAmount ?? 0,
            expectedMonthlyContribution: dto.expectedMonthlyContribution ?? null,
            deviationThreshold: dto.deviationThreshold ?? 0.15,
            status: dto.status ?? 'ACTIVE',
            startDate: new Date(dto.startDate),
            targetDate: new Date(dto.targetDate),
        });
        const savedGoal = await this.goalsRepository.save(goal);
        return this.getGoalById(userId, savedGoal.id);
    }
    async getGoalById(userId, goalId) {
        const goal = await this.goalsRepository.findOne({ where: { id: goalId, userId } });
        if (!goal) {
            throw new common_1.NotFoundException('Goal not found');
        }
        return this.buildGoalResponse(goal);
    }
    async findAll(userId) {
        const goals = await this.goalsRepository.find({ where: { userId } });
        const responses = await Promise.all(goals.map(goal => this.buildGoalResponse(goal)));
        const summary = responses.reduce((acc, goal) => {
            acc.total += 1;
            if (goal.status === 'COMPLETED' || goal.metrics.pace === 'completed') {
                acc.completed += 1;
            }
            else {
                acc.active += 1;
            }
            if (goal.metrics.pace === 'ahead') {
                acc.ahead += 1;
            }
            if (goal.metrics.pace === 'off_track') {
                acc.offTrack += 1;
            }
            if (goal.metrics.pace === 'on_track') {
                acc.onTrack += 1;
            }
            return acc;
        }, { total: 0, active: 0, completed: 0, onTrack: 0, offTrack: 0, ahead: 0 });
        return { goals: responses, summary };
    }
    async updateGoal(userId, goalId, dto) {
        const goal = await this.goalsRepository.findOne({ where: { id: goalId, userId } });
        if (!goal) {
            throw new common_1.NotFoundException('Goal not found');
        }
        if (dto.name !== undefined)
            goal.name = dto.name;
        if (dto.description !== undefined)
            goal.description = dto.description;
        if (dto.category !== undefined)
            goal.category = dto.category;
        if (dto.targetAmount !== undefined)
            goal.targetAmount = dto.targetAmount;
        if (dto.initialAmount !== undefined)
            goal.initialAmount = dto.initialAmount;
        if (dto.expectedMonthlyContribution !== undefined)
            goal.expectedMonthlyContribution = dto.expectedMonthlyContribution;
        if (dto.deviationThreshold !== undefined)
            goal.deviationThreshold = dto.deviationThreshold;
        if (dto.status !== undefined)
            goal.status = dto.status;
        if (dto.startDate !== undefined)
            goal.startDate = new Date(dto.startDate);
        if (dto.targetDate !== undefined)
            goal.targetDate = new Date(dto.targetDate);
        await this.goalsRepository.save(goal);
        if (dto.progressUpdate) {
            await this.recordProgress(goal.id, userId, dto.progressUpdate);
        }
        return this.getGoalById(userId, goalId);
    }
    async recordProgress(goalId, userId, dto) {
        const goal = await this.goalsRepository.findOne({ where: { id: goalId, userId } });
        if (!goal) {
            throw new common_1.NotFoundException('Goal not found');
        }
        const entry = this.progressRepository.create({
            goalId,
            actualAmount: dto.actualAmount,
            expectedAmount: dto.expectedAmount ?? this.calculateExpectedAmountForDate(goal, dto.recordedAt ? new Date(dto.recordedAt) : new Date()),
            note: dto.note,
            recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : new Date(),
        });
        const savedEntry = await this.progressRepository.save(entry);
        await this.evaluateGoalPacing(goal, userId);
        return savedEntry;
    }
    async getDashboardOverview(userId) {
        const { goals, summary } = await this.findAll(userId);
        return {
            summary,
            highlights: goals
                .sort((a, b) => b.metrics.progressPercentage - a.metrics.progressPercentage)
                .slice(0, 3),
        };
    }
    async buildGoalResponse(goal) {
        const entries = await this.progressRepository.find({
            where: { goalId: goal.id },
            order: { recordedAt: 'ASC' },
        });
        const progressHistory = entries.map(entry => ({
            id: entry.id,
            actualAmount: Number(entry.actualAmount),
            expectedAmount: entry.expectedAmount !== null && entry.expectedAmount !== undefined ? Number(entry.expectedAmount) : null,
            note: entry.note ?? undefined,
            recordedAt: entry.recordedAt.toISOString(),
        }));
        const metrics = this.calculateMetrics(goal, progressHistory);
        if (metrics.pace === 'completed' && goal.status !== 'COMPLETED') {
            goal.status = 'COMPLETED';
            await this.goalsRepository.save(goal);
        }
        return {
            id: goal.id,
            name: goal.name,
            description: goal.description ?? undefined,
            category: goal.category ?? undefined,
            status: goal.status,
            targetAmount: Number(goal.targetAmount),
            initialAmount: Number(goal.initialAmount ?? 0),
            expectedMonthlyContribution: goal.expectedMonthlyContribution !== null && goal.expectedMonthlyContribution !== undefined
                ? Number(goal.expectedMonthlyContribution)
                : null,
            deviationThreshold: Number(goal.deviationThreshold ?? 0.15),
            startDate: goal.startDate.toISOString(),
            targetDate: goal.targetDate.toISOString(),
            metrics,
            progressHistory,
        };
    }
    calculateMetrics(goal, history) {
        const initialAmount = Number(goal.initialAmount ?? 0);
        const targetAmount = Number(goal.targetAmount);
        const deviationThreshold = Number(goal.deviationThreshold ?? 0.15);
        const totalActual = history.reduce((sum, entry) => sum + entry.actualAmount, initialAmount);
        const now = new Date();
        const startDate = new Date(goal.startDate);
        const targetDate = new Date(goal.targetDate);
        const totalDurationMs = targetDate.getTime() - startDate.getTime();
        const elapsedMs = now.getTime() - startDate.getTime();
        const elapsedRatio = totalDurationMs > 0 ? Math.min(Math.max(elapsedMs / totalDurationMs, 0), 1) : 1;
        const expectedAmountByNow = targetAmount * elapsedRatio;
        const deviationAmount = totalActual - expectedAmountByNow;
        const deviationRatio = expectedAmountByNow > 0 ? deviationAmount / expectedAmountByNow : 0;
        const progressPercentage = targetAmount > 0 ? Math.min((totalActual / targetAmount) * 100, 200) : 0;
        let pace = 'on_track';
        if (progressPercentage >= 100) {
            pace = 'completed';
        }
        else if (deviationAmount > targetAmount * 0.05) {
            pace = 'ahead';
        }
        else if (deviationRatio < -deviationThreshold) {
            pace = 'off_track';
        }
        let eta = null;
        if (progressPercentage < 100 && totalActual > 0) {
            const elapsedDays = Math.max(elapsedMs / (1000 * 60 * 60 * 24), 1);
            const averageDailyContribution = totalActual / elapsedDays;
            if (averageDailyContribution > 0) {
                const remainingAmount = Math.max(Number(goal.targetAmount) - totalActual, 0);
                const daysToTarget = remainingAmount / averageDailyContribution;
                const etaDate = new Date(now.getTime() + daysToTarget * 24 * 60 * 60 * 1000);
                eta = etaDate.toISOString();
            }
        }
        const lastRecordedAt = history.length > 0 ? history[history.length - 1].recordedAt : goal.startDate.toISOString();
        return {
            totalActual: Number(totalActual.toFixed(2)),
            expectedAmountByNow: Number(expectedAmountByNow.toFixed(2)),
            deviationAmount: Number(deviationAmount.toFixed(2)),
            deviationRatio: Number(deviationRatio.toFixed(4)),
            progressPercentage: Number(progressPercentage.toFixed(2)),
            pace,
            eta,
            lastRecordedAt,
        };
    }
    calculateExpectedAmountForDate(goal, date) {
        const initialAmount = Number(goal.initialAmount ?? 0);
        const targetAmount = Number(goal.targetAmount);
        const startDate = new Date(goal.startDate);
        const targetDate = new Date(goal.targetDate);
        if (targetAmount <= initialAmount) {
            return targetAmount;
        }
        if (date.getTime() <= startDate.getTime()) {
            return initialAmount;
        }
        const totalDurationMs = targetDate.getTime() - startDate.getTime();
        if (totalDurationMs <= 0) {
            return targetAmount;
        }
        const elapsedMs = Math.min(Math.max(date.getTime() - startDate.getTime(), 0), totalDurationMs);
        const ratio = elapsedMs / totalDurationMs;
        return Number((initialAmount + (targetAmount - initialAmount) * ratio).toFixed(2));
    }
    async evaluateGoalPacing(goal, userId) {
        const response = await this.buildGoalResponse(goal);
        if (response.metrics.pace === 'off_track') {
            const user = await this.userService.findOne(userId);
            const shortfall = Math.max(response.metrics.expectedAmountByNow - response.metrics.totalActual, 0);
            const formatter = new Intl.NumberFormat('es-CL', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            });
            const message = `⚠️ Tu meta "${goal.name}" está un ${Math.abs(Math.round(response.metrics.deviationRatio * 100))}% por debajo del plan. Te faltan ${formatter.format(shortfall)} para estar al día.`;
            await this.notificationsService.createNotification(user, message, {
                eventType: 'goals.off_track',
                title: 'Meta financiera en riesgo',
                channels: ['email', 'push', 'in_app'],
                severity: 'warning',
                metadata: {
                    goalId: goal.id,
                    deviation: response.metrics.deviationRatio,
                    expected: response.metrics.expectedAmountByNow,
                    actual: response.metrics.totalActual,
                },
            });
        }
    }
};
exports.GoalsService = GoalsService;
exports.GoalsService = GoalsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(financial_goal_entity_1.FinancialGoal)),
    __param(1, (0, typeorm_1.InjectRepository)(goal_progress_entity_1.GoalProgress)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        notifications_service_1.NotificationsService,
        user_service_1.UserService])
], GoalsService);
//# sourceMappingURL=goals.service.js.map