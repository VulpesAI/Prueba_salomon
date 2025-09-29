import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateConsentStatusDto {
  @IsOptional()
  @IsBoolean()
  granted?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  version?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  reason?: string;

  @IsOptional()
  @IsString()
  requestedBy?: string;
}
