import { Injectable, Logger, MessageEvent, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, IsNull } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, Subject } from 'rxjs';
import { SyncRequest, SyncRequestStatus } from './entities/sync-request.entity';
import { CreateSyncRequestDto } from './dto/create-sync-request.dto';
import { UpdateSyncRequestDto } from './dto/update-sync-request.dto';

@Injectable()
export class SyncService implements OnModuleDestroy {
  private readonly logger = new Logger(SyncService.name);
  private readonly events$ = new Subject<MessageEvent>();
  private readonly onAnyHandler: (event: string | symbol, value: SyncRequest) => void;

  constructor(
    @InjectRepository(SyncRequest)
    private readonly syncRequestRepository: Repository<SyncRequest>,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.onAnyHandler = (event: string | symbol, value: SyncRequest) => {
      if (typeof event === 'string' && event.startsWith('sync.')) {
        this.events$.next({
          data: {
            event,
            id: value.id,
            clientRequestId: value.clientRequestId,
            status: value.status,
            attemptCount: value.attemptCount,
            scheduledAt: value.scheduledAt,
            processedAt: value.processedAt,
            updatedAt: value.updatedAt,
            errorMessage: value.errorMessage,
          },
        });
      }
    };

    this.eventEmitter.onAny(this.onAnyHandler);
  }

  onModuleDestroy() {
    this.eventEmitter.offAny(this.onAnyHandler);
    this.events$.complete();
  }

  getEventsStream(): Observable<MessageEvent> {
    return this.events$.asObservable();
  }

  async enqueue(createDto: CreateSyncRequestDto): Promise<SyncRequest> {
    const scheduledAt = createDto.scheduledAt ? new Date(createDto.scheduledAt) : null;

    const existing = await this.syncRequestRepository.findOne({
      where: { clientRequestId: createDto.clientRequestId },
    });

    if (existing) {
      this.logger.debug(`Solicitud de sincronización duplicada ${existing.clientRequestId}, devolviendo registro existente.`);
      return existing;
    }

    const request = this.syncRequestRepository.create({
      clientRequestId: createDto.clientRequestId,
      endpoint: createDto.endpoint,
      payload: createDto.payload ?? null,
      metadata: createDto.metadata ?? null,
      scheduledAt,
      status: 'QUEUED',
    });

    const saved = await this.syncRequestRepository.save(request);
    this.eventEmitter.emit('sync.queued', saved);
    return saved;
  }

  async listPending(limit = 50): Promise<SyncRequest[]> {
    return this.syncRequestRepository.find({
      where: [
        { status: 'QUEUED', scheduledAt: IsNull() },
        { status: 'QUEUED', scheduledAt: LessThanOrEqual(new Date()) },
      ],
      order: {
        scheduledAt: 'ASC',
        createdAt: 'ASC',
      },
      take: limit,
    });
  }

  async update(id: string, updateDto: UpdateSyncRequestDto): Promise<SyncRequest> {
    const request = await this.syncRequestRepository.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException(`No se encontró la solicitud ${id}`);
    }

    if (updateDto.status) {
      request.status = updateDto.status;
      if (updateDto.status === 'IN_PROGRESS' || updateDto.status === 'FAILED') {
        request.lastAttemptAt = new Date();
        request.attemptCount += 1;
      }
      if (updateDto.status === 'COMPLETED') {
        request.processedAt = new Date();
      }
    }

    if (typeof updateDto.errorMessage !== 'undefined') {
      request.errorMessage = updateDto.errorMessage ?? null;
    }

    const saved = await this.syncRequestRepository.save(request);
    this.eventEmitter.emit('sync.updated', saved);
    return saved;
  }

  async resetToQueued(id: string, delaySeconds = 30): Promise<SyncRequest> {
    const request = await this.syncRequestRepository.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException(`No se encontró la solicitud ${id}`);
    }

    request.status = 'QUEUED';
    request.scheduledAt = new Date(Date.now() + delaySeconds * 1000);
    request.errorMessage = null;

    const saved = await this.syncRequestRepository.save(request);
    this.eventEmitter.emit('sync.requeued', saved);
    return saved;
  }

  async getByClientRequestId(clientRequestId: string): Promise<SyncRequest | null> {
    return this.syncRequestRepository.findOne({ where: { clientRequestId } });
  }

  async getById(id: string): Promise<SyncRequest> {
    const request = await this.syncRequestRepository.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException(`No se encontró la solicitud ${id}`);
    }
    return request;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async scheduleRetries(): Promise<void> {
    const now = new Date();
    const candidates = await this.syncRequestRepository.find({
      where: [
        { status: 'FAILED', scheduledAt: LessThanOrEqual(now) },
        { status: 'QUEUED', scheduledAt: LessThanOrEqual(now) },
        { status: 'QUEUED', scheduledAt: IsNull() },
      ],
      take: 100,
      order: { scheduledAt: 'ASC', createdAt: 'ASC' },
    });

    if (candidates.length === 0) {
      return;
    }

    this.logger.debug(`Encontradas ${candidates.length} solicitudes listas para reenviar`);

    for (const request of candidates) {
      this.eventEmitter.emit('sync.ready', request);
    }
  }

  getRetryDelay(attempt: number): number {
    const baseDelay = 5;
    const maxDelay = 60 * 15;
    const exponential = baseDelay * Math.pow(2, attempt);
    return Math.min(exponential, maxDelay);
  }

  async markFailed(id: string, errorMessage: string): Promise<SyncRequest> {
    const request = await this.getById(id);
    request.status = 'FAILED';
    request.errorMessage = errorMessage;
    request.lastAttemptAt = new Date();
    request.attemptCount += 1;
    const delay = this.getRetryDelay(request.attemptCount);
    request.scheduledAt = new Date(Date.now() + delay * 1000);
    const saved = await this.syncRequestRepository.save(request);
    this.logger.warn(`Solicitud ${id} marcada como FAILED. Reintento en ${delay}s`);
    this.eventEmitter.emit('sync.failed', saved);
    return saved;
  }

  async markCompleted(id: string): Promise<SyncRequest> {
    const request = await this.getById(id);
    request.status = 'COMPLETED';
    request.processedAt = new Date();
    request.errorMessage = null;
    const saved = await this.syncRequestRepository.save(request);
    this.eventEmitter.emit('sync.completed', saved);
    return saved;
  }
}
