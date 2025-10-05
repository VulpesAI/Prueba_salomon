import { Type } from 'class-transformer';
import { IsEnum, IsISO8601, IsOptional, IsString, ValidateIf } from 'class-validator';

export enum DashboardGranularity {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class DashboardSummaryQueryDto {
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
  @IsEnum(DashboardGranularity)
  granularity?: DashboardGranularity;

  @IsOptional()
  @Type(() => Number)
  maxCategories?: number;

  @IsOptional()
  @ValidateIf((_, value) => value === undefined || typeof value === 'string')
  @IsString()
  currency?: string;
}
