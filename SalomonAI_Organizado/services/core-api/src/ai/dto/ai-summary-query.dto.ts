import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class AiSummaryQueryDto {
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
}
