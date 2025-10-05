import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GetStatementsQueryDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsOptional()
  status?: string;
}
