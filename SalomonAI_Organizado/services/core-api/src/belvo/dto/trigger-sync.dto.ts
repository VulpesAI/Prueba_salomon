import { IsOptional, IsString } from 'class-validator';

export class TriggerBelvoSyncDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsString()
  dataset?: 'transactions' | 'accounts' | 'balances';
}
