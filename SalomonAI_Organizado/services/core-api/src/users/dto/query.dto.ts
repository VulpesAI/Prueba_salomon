import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class QueryDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  query: string;
}