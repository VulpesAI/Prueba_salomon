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
export interface GoalsSummary {
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
export declare class GoalsService {
    private readonly goalsRepository;
    private readonly progressRepository;
    private readonly notificationsService;
    private readonly userService;
    constructor(goalsRepository: Repository<FinancialGoal>, progressRepository: Repository<GoalProgress>, notificationsService: NotificationsService, userService: UserService);
    createGoal(userId: string, dto: CreateGoalDto): Promise<GoalResponse>;
    getGoalById(userId: string, goalId: string): Promise<GoalResponse>;
    findAll(userId: string): Promise<{
        goals: GoalResponse[];
        summary: GoalsSummary;
    }>;
    updateGoal(userId: string, goalId: string, dto: UpdateGoalDto): Promise<GoalResponse>;
    recordProgress(goalId: string, userId: string, dto: ProgressUpdateDto): Promise<GoalProgress>;
    getDashboardOverview(userId: string): Promise<{
        summary: GoalsSummary;
        highlights: GoalResponse[];
    }>;
    private buildGoalResponse;
    private calculateMetrics;
    private calculateExpectedAmountForDate;
    private evaluateGoalPacing;
}
export {};
