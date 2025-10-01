import { Injectable, Logger } from '@nestjs/common';
import { QdrantVectorService } from './qdrant.tokens';

@Injectable()
export class NoopQdrantService implements QdrantVectorService {
  private readonly logger = new Logger(NoopQdrantService.name);

  async onModuleInit(): Promise<void> {
    this.logger.warn('Qdrant URL is not configured. Using NoopQdrantService.');
  }

  async healthCheck(): Promise<boolean> {
    return false;
  }

  async createCollection(): Promise<void> {
    this.logger.debug('Skipping Qdrant collection creation because Qdrant is disabled.');
  }

  async search(): Promise<Array<{ payload: any; score: number }>> {
    this.logger.debug('Skipping Qdrant search because Qdrant is disabled.');
    return [];
  }

  async upsertPoint(): Promise<void> {
    this.logger.debug('Skipping Qdrant point upsert because Qdrant is disabled.');
  }

  async upsert(): Promise<void> {
    this.logger.debug('Skipping Qdrant batch upsert because Qdrant is disabled.');
  }
}
