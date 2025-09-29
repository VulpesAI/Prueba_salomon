import { IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { DsarRequestStatus } from '../entities/dsar-request.entity';

export class ResolveDsarRequestDto {
  @IsEnum(DsarRequestStatus)
  status!: DsarRequestStatus;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  resolutionNotes?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  completedBy?: string;
}
