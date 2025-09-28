import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateGoalDto } from './create-goal.dto';
import { ProgressUpdateDto } from './progress-update.dto';
import { GoalStatus } from '../entities/financial-goal.entity';

export class UpdateGoalDto extends PartialType(CreateGoalDto) {
  @IsOptional()
  @ValidateNested()
  @Type(() => ProgressUpdateDto)
  progressUpdate?: ProgressUpdateDto;

  @IsOptional()
  status?: GoalStatus;
}
