import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class ProgressUpdateDto {
  @IsNumber()
  @Type(() => Number)
  actualAmount: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  expectedAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsDateString()
  recordedAt?: string;
}
