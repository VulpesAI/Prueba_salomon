import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

import { PARSING_ENGINE_CLIENT, PARSING_ENGINE_EVENT } from './statements.constants';

export interface StatementQueuedEvent {
  statementId: string;
  userId: string;
  storagePath: string;
}

@Injectable()
export class ParsingEngineProducer {
  private readonly logger = new Logger(ParsingEngineProducer.name);

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    @Inject(PARSING_ENGINE_CLIENT)
    private readonly client: ClientProxy | null,
  ) {}

  async emitStatementQueued(event: StatementQueuedEvent): Promise<void> {
    const topic =
      this.configService.get<string>('messaging.parsingEngine.topic', {
        infer: true,
      }) ?? 'parsing-engine.statements';

    if (!this.client) {
      this.logger.warn(
        `Parsing engine producer is disabled. Event not emitted: ${JSON.stringify(event)}`,
      );
      return;
    }

    try {
      const result$ = this.client.emit(topic ?? PARSING_ENGINE_EVENT, event);
      await lastValueFrom(result$);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown parsing engine emission error';
      this.logger.error(`Failed to emit parsing event: ${message}`);
      throw error;
    }
  }
}
