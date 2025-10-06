import { Type } from 'class-transformer';
import { IsEnum, IsISO8601, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export enum MovementSortField {
  POSTED_AT = 'postedAt',
  AMOUNT = 'amount',
}

export enum MovementSortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export enum MovementTypeFilter {
  INFLOW = 'inflow',
  OUTFLOW = 'outflow',
}

export class GetMovementsQueryDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  statementId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  merchant?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxAmount?: number;

  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @IsOptional()
  @IsEnum(MovementTypeFilter)
  type?: MovementTypeFilter;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  pageSize?: number;

  @IsOptional()
  @IsEnum(MovementSortField)
  sortBy?: MovementSortField;

  @IsOptional()
  @IsEnum(MovementSortDirection)
  sortDirection?: MovementSortDirection;
}
