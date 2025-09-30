import { User } from '../../users/entities/user.entity';
import { GoalProgress } from './goal-progress.entity';
export declare const GOAL_STATUS_VALUES: readonly ["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"];
export type GoalStatus = (typeof GOAL_STATUS_VALUES)[number];
export declare class FinancialGoal {
    id: string;
    userId: string;
    user: User;
    name: string;
    description?: string;
    category?: string;
    targetAmount: number;
    initialAmount: number;
    expectedMonthlyContribution?: number | null;
    deviationThreshold: number;
    status: GoalStatus;
    startDate: Date;
    targetDate: Date;
    progressEntries: GoalProgress[];
    createdAt: Date;
    updatedAt: Date;
}
