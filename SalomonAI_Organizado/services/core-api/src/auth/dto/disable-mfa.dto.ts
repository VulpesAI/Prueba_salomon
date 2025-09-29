import { IsOptional, IsString } from 'class-validator';

export class DisableMfaDto {
  @IsString()
  @IsOptional()
  token?: string;

  @IsString()
  @IsOptional()
  backupCode?: string;
}

