import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
export declare class GoalsController {
    private readonly goalsService;
    constructor(goalsService: GoalsService);
    create(req: any, dto: CreateGoalDto): Promise<import("./goals.service").GoalResponse>;
    findAll(req: any): Promise<{
        goals: import("./goals.service").GoalResponse[];
        summary: import("./goals.service").GoalsSummary;
    }>;
    findOne(req: any, goalId: string): Promise<import("./goals.service").GoalResponse>;
    update(req: any, goalId: string, dto: UpdateGoalDto): Promise<import("./goals.service").GoalResponse>;
}
