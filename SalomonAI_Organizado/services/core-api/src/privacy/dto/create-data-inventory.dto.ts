import { IsDateString, IsInt, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateDataInventoryDto {
  @IsString()
  @MaxLength(120)
  dataSubjectId!: string;

  @IsString()
  @MaxLength(120)
  dataCategory!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  sourceSystem?: string;

  @IsDateString()
  collectedAt!: string;

  @IsInt()
  @Min(1)
  retentionPeriodDays!: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  requestedBy?: string;
}
