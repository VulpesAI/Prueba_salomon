import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialGoal, GoalStatus } from './entities/financial-goal.entity';
import { GoalProgress } from './entities/goal-progress.entity';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { ProgressUpdateDto } from './dto/progress-update.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { UserService } from '../users/user.service';

interface GoalProgressView {
  id: string;
  actualAmount: number;
  expectedAmount: number | null;
  note?: string;
  recordedAt: string;
}

interface GoalsSummary {
  total: number;
  active: number;
  completed: number;
  onTrack: number;
  offTrack: number;
  ahead: number;
}

interface GoalMetrics {
  totalActual: number;
  expectedAmountByNow: number;
  deviationAmount: number;
  deviationRatio: number;
  progressPercentage: number;
  pace: 'ahead' | 'on_track' | 'off_track' | 'completed';
  eta: string | null;
  lastRecordedAt: string | null;
}

export interface GoalResponse {
  id: string;
  name: string;
  description?: string;
  category?: string;
  status: GoalStatus;
  targetAmount: number;
  initialAmount: number;
  expectedMonthlyContribution: number | null;
  deviationThreshold: number;
  startDate: string;
  targetDate: string;
  metrics: GoalMetrics;
  progressHistory: GoalProgressView[];
}

@Injectable()
export class GoalsService {
  constructor(
    @InjectRepository(FinancialGoal)
    private readonly goalsRepository: Repository<FinancialGoal>,
    @InjectRepository(GoalProgress)
    private readonly progressRepository: Repository<GoalProgress>,
    private readonly notificationsService: NotificationsService,
    private readonly userService: UserService,
  ) {}

  async createGoal(userId: string, dto: CreateGoalDto): Promise<GoalResponse> {
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

  async getGoalById(userId: string, goalId: string): Promise<GoalResponse> {
    const goal = await this.goalsRepository.findOne({ where: { id: goalId, userId } });

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    return this.buildGoalResponse(goal);
  }

  async findAll(userId: string): Promise<{ goals: GoalResponse[]; summary: GoalsSummary }> {
    const goals = await this.goalsRepository.find({ where: { userId } });

    const responses = await Promise.all(goals.map(goal => this.buildGoalResponse(goal)));

    const summary = responses.reduce<GoalsSummary>((acc, goal) => {
      acc.total += 1;
      if (goal.status === 'COMPLETED' || goal.metrics.pace === 'completed') {
        acc.completed += 1;
      } else {
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

  async updateGoal(userId: string, goalId: string, dto: UpdateGoalDto): Promise<GoalResponse> {
    const goal = await this.goalsRepository.findOne({ where: { id: goalId, userId } });

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    if (dto.name !== undefined) goal.name = dto.name;
    if (dto.description !== undefined) goal.description = dto.description;
    if (dto.category !== undefined) goal.category = dto.category;
    if (dto.targetAmount !== undefined) goal.targetAmount = dto.targetAmount;
    if (dto.initialAmount !== undefined) goal.initialAmount = dto.initialAmount;
    if (dto.expectedMonthlyContribution !== undefined)
      goal.expectedMonthlyContribution = dto.expectedMonthlyContribution;
    if (dto.deviationThreshold !== undefined) goal.deviationThreshold = dto.deviationThreshold;
    if (dto.status !== undefined) goal.status = dto.status;
    if (dto.startDate !== undefined) goal.startDate = new Date(dto.startDate);
    if (dto.targetDate !== undefined) goal.targetDate = new Date(dto.targetDate);

    await this.goalsRepository.save(goal);

    if (dto.progressUpdate) {
      await this.recordProgress(goal.id, userId, dto.progressUpdate);
    }

    return this.getGoalById(userId, goalId);
  }

  async recordProgress(goalId: string, userId: string, dto: ProgressUpdateDto): Promise<GoalProgress> {
    const goal = await this.goalsRepository.findOne({ where: { id: goalId, userId } });
    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    const entry = this.progressRepository.create({
      goalId,
      actualAmount: dto.actualAmount,
      expectedAmount:
        dto.expectedAmount ?? this.calculateExpectedAmountForDate(goal, dto.recordedAt ? new Date(dto.recordedAt) : new Date()),
      note: dto.note,
      recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : new Date(),
    });

    const savedEntry = await this.progressRepository.save(entry);

    await this.evaluateGoalPacing(goal, userId);

    return savedEntry;
  }

  async getDashboardOverview(userId: string) {
    const { goals, summary } = await this.findAll(userId);

    return {
      summary,
      highlights: goals
        .sort((a, b) => b.metrics.progressPercentage - a.metrics.progressPercentage)
        .slice(0, 3),
    };
  }

  private async buildGoalResponse(goal: FinancialGoal): Promise<GoalResponse> {
    const entries = await this.progressRepository.find({
      where: { goalId: goal.id },
      order: { recordedAt: 'ASC' },
    });

    const progressHistory: GoalProgressView[] = entries.map(entry => ({
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
      expectedMonthlyContribution:
        goal.expectedMonthlyContribution !== null && goal.expectedMonthlyContribution !== undefined
          ? Number(goal.expectedMonthlyContribution)
          : null,
      deviationThreshold: Number(goal.deviationThreshold ?? 0.15),
      startDate: goal.startDate.toISOString(),
      targetDate: goal.targetDate.toISOString(),
      metrics,
      progressHistory,
    };
  }

  private calculateMetrics(goal: FinancialGoal, history: GoalProgressView[]): GoalMetrics {
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

    let pace: GoalMetrics['pace'] = 'on_track';
    if (progressPercentage >= 100) {
      pace = 'completed';
    } else if (deviationAmount > targetAmount * 0.05) {
      pace = 'ahead';
    } else if (deviationRatio < -deviationThreshold) {
      pace = 'off_track';
    }

    let eta: string | null = null;
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

  private calculateExpectedAmountForDate(goal: FinancialGoal, date: Date): number {
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

  private async evaluateGoalPacing(goal: FinancialGoal, userId: string) {
    const response = await this.buildGoalResponse(goal);
    if (response.metrics.pace === 'off_track') {
      const user = await this.userService.findOne(userId);
      const shortfall = Math.max(response.metrics.expectedAmountByNow - response.metrics.totalActual, 0);
      const formatter = new Intl.NumberFormat('es-CL', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      const message = `⚠️ Tu meta "${goal.name}" está un ${Math.abs(Math.round(response.metrics.deviationRatio * 100))}% por debajo del plan. Te faltan ${formatter.format(shortfall)} para estar al día.`;
      await this.notificationsService.createNotification(user, message);
    }
  }
}
