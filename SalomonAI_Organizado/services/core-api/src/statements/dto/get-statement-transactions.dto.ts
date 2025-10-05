import { IsNotEmpty, IsString } from 'class-validator';

export class GetStatementTransactionsParamsDto {
  @IsString()
  @IsNotEmpty()
  id!: string;
}

export class GetStatementTransactionsQueryDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;
}
