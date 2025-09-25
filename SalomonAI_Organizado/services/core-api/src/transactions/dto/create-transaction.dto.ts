import { IsDateString, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, IsNumberString } from 'class-validator';

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER',
}

export class CreateTransactionDto {
  @IsUUID()
  documentId: string;

  @IsUUID()
  userId: string;

  @IsUUID()
  accountId: string;

  @IsString()
  @IsOptional()
  externalId?: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumberString()
  amount: string;

  @IsString()
  currency: string;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsOptional()
  @IsString()
  category?: string;

  @IsDateString()
  occurredAt: string;

  @IsOptional()
  @IsString()
  checksum?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
