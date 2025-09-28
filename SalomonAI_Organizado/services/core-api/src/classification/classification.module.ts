import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { ClassificationService } from './classification.service';
import { ClassificationLabel } from './entities/classification-label.entity';
import { ClassificationController } from './classification.controller';
import { FinancialMovement } from '../financial-movements/entities/financial-movement.entity';
import { KafkaModule } from '../kafka/kafka.module';
import { NlpModule } from '../nlp/nlp.module';
import { QdrantModule } from '../qdrant/qdrant.module';

/**
 * Módulo avanzado de clasificación con capacidades modernas
 * Incluye cache, eventos, tareas programadas y rate limiting
 * @version 3.0
 */
@Module({
  imports: [
    // Módulos core
    NlpModule, 
    QdrantModule,
    KafkaModule,
    TypeOrmModule.forFeature([ClassificationLabel, FinancialMovement]),

    // Cache para mejorar performance
    CacheModule.register({
      ttl: 300, // 5 minutos
      max: 100, // Máximo 100 elementos en cache
    }),
    
    // Sistema de eventos para monitoreo y analytics
    EventEmitterModule.forRoot({
      // Configuración de eventos
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
    
    // Tareas programadas para mantenimiento
    ScheduleModule.forRoot(),
    
    // Rate limiting para protección de API
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 segundo
        limit: 10, // 10 requests por segundo
      },
      {
        name: 'medium',
        ttl: 60000, // 1 minuto
        limit: 100, // 100 requests por minuto
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hora
        limit: 1000, // 1000 requests por hora
      },
    ]),
  ],
  controllers: [ClassificationController],
  providers: [ClassificationService],
  exports: [ClassificationService],
})
export class ClassificationModule {}

