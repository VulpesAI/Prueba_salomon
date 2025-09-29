import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { SYNC_REQUEST_STATUSES, SyncRequestStatus } from '../entities/sync-request.entity';

export class UpdateSyncRequestDto {
  @ApiPropertyOptional({ description: 'Estado actualizado de la solicitud.' })
  @IsOptional()
  @IsIn(SYNC_REQUEST_STATUSES)
  status?: SyncRequestStatus;

  @ApiPropertyOptional({ description: 'Mensaje de error asociado al último intento.' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  errorMessage?: string;
}
