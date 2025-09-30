import { GoalStatus } from '../entities/financial-goal.entity';
export declare class CreateGoalDto {
    name: string;
    description?: string;
    category?: string;
    targetAmount: number;
    initialAmount?: number;
    expectedMonthlyContribution?: number;
    deviationThreshold?: number;
    startDate: string;
    targetDate: string;
    status?: GoalStatus;
}
