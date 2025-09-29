import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { RetentionPolicyAction } from '../entities/retention-policy.entity';

export class UpdateRetentionPolicyDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  retentionPeriodDays?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  gracePeriodDays?: number;

  @IsOptional()
  @IsEnum(RetentionPolicyAction)
  action?: RetentionPolicyAction;

  @IsOptional()
  @IsString()
  legalBasis?: string;

  @IsOptional()
  @IsString()
  requestedBy?: string;
}
