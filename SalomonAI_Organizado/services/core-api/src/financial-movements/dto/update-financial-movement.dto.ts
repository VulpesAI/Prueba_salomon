import { IsString, IsNotEmpty, IsUUID, Length } from 'class-validator';

export class UpdateFinancialMovementDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  category: string;

  @IsUUID()
  userId: string;
}