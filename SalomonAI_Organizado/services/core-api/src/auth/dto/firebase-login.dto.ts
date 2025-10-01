import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class FirebaseLoginDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  idToken?: string;
}
