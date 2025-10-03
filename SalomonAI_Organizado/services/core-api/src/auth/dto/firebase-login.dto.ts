import { IsString, MinLength, ValidateIf } from 'class-validator';

export class FirebaseLoginDto {
  @ValidateIf((value) => value.token !== undefined)
  @IsString()
  @MinLength(10)
  token?: string;

  @ValidateIf((value) => value.idToken !== undefined)
  @IsString()
  @MinLength(10)
  idToken?: string;

  @ValidateIf((value) => value.id_token !== undefined)
  @IsString()
  @MinLength(10)
  id_token?: string;
}
