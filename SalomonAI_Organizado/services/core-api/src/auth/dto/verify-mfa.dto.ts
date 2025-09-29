import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyMfaDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

