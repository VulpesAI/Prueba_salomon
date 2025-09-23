import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QdrantService } from './qdrant.service';

@Module({
  imports: [ConfigModule], // QdrantService likely needs ConfigService
  providers: [QdrantService],
  exports: [QdrantService],
})
export class QdrantModule {}