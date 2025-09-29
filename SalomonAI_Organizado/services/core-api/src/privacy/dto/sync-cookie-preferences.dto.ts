import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class SyncCookiePreferencesDto {
  @IsString()
  @MaxLength(120)
  userId!: string;

  @IsObject()
  preferences!: Record<string, boolean>;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  source?: string;

  @IsOptional()
  @IsString()
  requestedBy?: string;
}
