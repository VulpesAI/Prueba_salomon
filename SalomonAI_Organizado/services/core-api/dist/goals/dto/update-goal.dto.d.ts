import { CreateGoalDto } from './create-goal.dto';
import { ProgressUpdateDto } from './progress-update.dto';
import { GoalStatus } from '../entities/financial-goal.entity';
declare const UpdateGoalDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreateGoalDto>>;
export declare class UpdateGoalDto extends UpdateGoalDto_base {
    progressUpdate?: ProgressUpdateDto;
    status?: GoalStatus;
}
export {};
