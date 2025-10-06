import { Type } from 'class-transformer';
import { IsISO8601, IsOptional, IsString, Min, ValidateIf } from 'class-validator';

export class DashboardResumenQueryDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  projectionDays?: number;

  @IsOptional()
  @ValidateIf((_, value) => value === undefined || typeof value === 'string')
  @IsString()
  currency?: string;
}
