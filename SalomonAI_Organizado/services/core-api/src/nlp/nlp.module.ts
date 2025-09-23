import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { NlpService } from './nlp.service';
import { NlpController } from './nlp.controller';

/**
 * Módulo avanzado de NLP para procesamiento de texto en español
 * Incluye cache para mejorar performance y reducir carga computacional
 * @version 3.0
 */
@Module({
  imports: [
    HttpModule,
    // Cache para embeddings y procesamiento de texto
    CacheModule.register({
      ttl: 3600, // 1 hora para embeddings y análisis
      max: 500,  // Máximo 500 elementos en cache
    }),
  ],
  controllers: [NlpController],
  providers: [NlpService],
  exports: [NlpService],
})
export class NlpModule {}

