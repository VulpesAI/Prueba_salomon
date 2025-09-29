import { IsBoolean, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class LogConsentDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  userId?: string;

  @IsString()
  @MaxLength(120)
  consentType!: string;

  @IsOptional()
  @IsBoolean()
  granted?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  channel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  version?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  requestedBy?: string;
}
