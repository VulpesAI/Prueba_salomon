import { FinancialGoal } from './financial-goal.entity';
export declare class GoalProgress {
    id: string;
    goalId: string;
    goal: FinancialGoal;
    actualAmount: number;
    expectedAmount?: number | null;
    note?: string;
    recordedAt: Date;
    createdAt: Date;
}
