import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { GOAL_STATUS_VALUES, GoalStatus } from '../entities/financial-goal.entity';

export class CreateGoalDto {
  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  targetAmount: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  initialAmount?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  expectedMonthlyContribution?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  deviationThreshold?: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  targetDate: string;

  @IsOptional()
  @IsEnum(GOAL_STATUS_VALUES)
  status?: GoalStatus;
}
