import { IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { DsarRequestType } from '../entities/dsar-request.entity';

export class CreateDsarRequestDto {
  @IsString()
  @MaxLength(120)
  userId!: string;

  @IsOptional()
  @IsEnum(DsarRequestType)
  type?: DsarRequestType;

  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  requestedBy?: string;
}
