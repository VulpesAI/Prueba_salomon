import { IsOptional, IsString } from 'class-validator';

export class GenerateBelvoLinkTokenDto {
  @IsString()
  userId!: string;

  @IsString()
  institution!: string;

  @IsOptional()
  @IsString()
  accessMode?: 'single' | 'recurrent';
}
