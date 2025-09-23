import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { WinstonModule } from 'nest-winston';
import { configModuleOptions } from './config/config.module-options';
import { createLoggerConfig } from './config/logger.config';
import { 
  createDatabaseConfig, 
  createCacheConfig, 
  createThrottlerConfig 
} from './config/app.config';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './users/user.module';
import { FirebaseModule } from './firebase/firebase.module';
import { KafkaModule } from './kafka/kafka.module';
import { QdrantModule } from './qdrant/qdrant.module';
import { ClassificationModule } from './classification/classification.module';
import { ClassificationRulesModule } from './classification-rules/classification-rules.module';
import { NlpModule } from './nlp/nlp.module';
import { TransactionsModule } from './transactions/transactions.module';
import { HealthModule } from './health/health.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { BelvoModule } from './belvo/belvo.module';

@Module({
  imports: [
    // Core Configuration
    ConfigModule.forRoot(configModuleOptions),
    
    // Logging
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => createLoggerConfig(configService),
    }),
    
    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => createDatabaseConfig(configService),
    }),
    
    // Cache Management
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => createCacheConfig(configService),
    }),
    
    // Event System
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    
    // Scheduled Tasks
    ScheduleModule.forRoot(),
    
    // Rate Limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => createThrottlerConfig(configService),
    }),

    // Feature Modules
    AuthModule,
    UserModule,
    FirebaseModule,
    DashboardModule,
    BelvoModule,
    TransactionsModule,
    ClassificationModule,
    ClassificationRulesModule,
    NlpModule,

    // Infrastructure Modules
    KafkaModule,
    QdrantModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}