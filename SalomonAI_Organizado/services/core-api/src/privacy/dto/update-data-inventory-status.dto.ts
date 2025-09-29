import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { DataInventoryStatus } from '../entities/data-inventory.entity';

export class UpdateDataInventoryStatusDto {
  @IsEnum(DataInventoryStatus)
  status!: DataInventoryStatus;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  reason?: string;

  @IsOptional()
  @IsString()
  requestedBy?: string;
}
