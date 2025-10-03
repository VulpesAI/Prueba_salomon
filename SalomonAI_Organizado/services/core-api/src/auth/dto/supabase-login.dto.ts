import { IsString, MinLength } from 'class-validator';

export class SupabaseLoginDto {
  @IsString()
  @MinLength(10)
  access_token!: string;
}
