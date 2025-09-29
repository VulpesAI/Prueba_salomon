import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateSyncRequestDto {
  @ApiProperty({ description: 'Identificador único generado en el cliente para garantizar idempotencia.' })
  @IsUUID()
  clientRequestId: string;

  @ApiProperty({ description: 'Ruta del endpoint de negocio que debe ejecutarse cuando el dispositivo esté en línea.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  endpoint: string;

  @ApiPropertyOptional({ description: 'Carga útil enviada originalmente por el cliente.' })
  @IsOptional()
  payload?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Fecha en la que se debe reintentar el procesamiento.' })
  @IsOptional()
  @IsISO8601({ strict: false })
  scheduledAt?: string;

  @ApiPropertyOptional({ description: 'Metadatos adicionales de control generados por el cliente.' })
  @IsOptional()
  metadata?: Record<string, any>;
}
