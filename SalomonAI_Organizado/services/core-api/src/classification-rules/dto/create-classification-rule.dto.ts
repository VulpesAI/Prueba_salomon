import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateClassificationRuleDto {
  @IsString()
  pattern: string;

  @IsString()
  category: string;

  @IsNumber()
  @Min(0)
  priority: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  maxAmount?: number;

  @IsString()
  @IsOptional()
  description?: string;
}
