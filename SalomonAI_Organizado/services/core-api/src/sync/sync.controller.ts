import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query, Sse } from '@nestjs/common';
import { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { CreateSyncRequestDto } from './dto/create-sync-request.dto';
import { UpdateSyncRequestDto } from './dto/update-sync-request.dto';

@ApiTags('sync')
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Sse('events')
  @ApiOperation({ summary: 'Canal de eventos en tiempo real para cambios de sincronización (SSE).' })
  events(): Observable<MessageEvent> {
    return this.syncService.getEventsStream();
  }

  @Post('requests')
  @ApiOperation({ summary: 'Encola una nueva solicitud offline garantizando idempotencia.' })
  enqueue(@Body() createDto: CreateSyncRequestDto) {
    return this.syncService.enqueue(createDto);
  }

  @Get('requests/pending')
  @ApiOperation({ summary: 'Obtiene las próximas solicitudes pendientes de sincronización.' })
  listPending(@Query('limit') limit?: string) {
    const numericLimit = limit ? Math.min(parseInt(limit, 10) || 50, 200) : 50;
    return this.syncService.listPending(numericLimit);
  }

  @Get('requests/:id')
  @ApiOperation({ summary: 'Recupera el estado de una solicitud encolada.' })
  getById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.syncService.getById(id);
  }

  @Get('requests/by-client/:clientRequestId')
  @ApiOperation({ summary: 'Recupera una solicitud en base al identificador del cliente.' })
  getByClientRequest(@Param('clientRequestId', new ParseUUIDPipe()) clientRequestId: string) {
    return this.syncService.getByClientRequestId(clientRequestId);
  }

  @Put('requests/:id')
  @ApiOperation({ summary: 'Actualiza el estado de una solicitud (p. ej. marcar completada o fallida).' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateDto: UpdateSyncRequestDto,
  ) {
    return this.syncService.update(id, updateDto);
  }

  @Post('requests/:id/failed')
  @ApiOperation({ summary: 'Marca una solicitud como fallida y programa un reintento exponencial.' })
  markFailed(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body('errorMessage') errorMessage: string,
  ) {
    return this.syncService.markFailed(id, errorMessage ?? 'Error desconocido');
  }

  @Post('requests/:id/completed')
  @ApiOperation({ summary: 'Marca una solicitud como completada.' })
  markCompleted(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.syncService.markCompleted(id);
  }
}
