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
  createThrottlerConfig,
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
import { FinancialForecastsModule } from './financial-forecasts/financial-forecasts.module';
import { AlertsModule } from './alerts/alerts.module';
import { NotificationsModule } from './notifications/notifications.module';
import { GoalsModule } from './goals/goals.module';
import { SecurityModule } from './security/security.module';
import { PrivacyModule } from './privacy/privacy.module';
import { validateEnv, isStrictEnv, EnvStrictnessMode } from './config/env.validation';

const envVars = validateEnv(process.env);
const strictMode = isStrictEnv(envVars);
const envMode: EnvStrictnessMode = strictMode ? 'strict' : 'minimal';

const isDatabaseConfigured =
  strictMode ||
  ['POSTGRES_HOST', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB'].every((key) => {
    const value = (envVars as Record<string, unknown>)[key];
    return typeof value === 'string' ? value.trim().length > 0 : value !== undefined && value !== null;
  });

const isKafkaConfigured = strictMode || Boolean(process.env.KAFKA_BROKER?.trim());
const isQdrantConfigured =
  strictMode ||
  (typeof envVars.QDRANT_URL === 'string' && envVars.QDRANT_URL.trim().length > 0);
const isRecommendationsConfigured =
  strictMode ||
  (typeof envVars.RECOMMENDATION_ENGINE_URL === 'string' &&
    envVars.RECOMMENDATION_ENGINE_URL.trim().length > 0);

const authModules = [AuthModule.register({ mode: envMode }), UserModule.register({ mode: envMode })];

const databaseModules = isDatabaseConfigured
  ? [
      TypeOrmModule.forRootAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => createDatabaseConfig(configService),
      }),
      ...authModules,
      BelvoModule,
      FinancialForecastsModule,
      AlertsModule,
      NotificationsModule,
      GoalsModule,
      TransactionsModule,
      ClassificationModule,
      ClassificationRulesModule,
      PrivacyModule,
    ]
  : authModules;

const dashboardModules = isDatabaseConfigured
  ? [DashboardModule.register({ recommendationsEnabled: isRecommendationsConfigured })]
  : [];

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
    
    // Cache Management
    CacheModule.registerAsync({
      isGlobal: true,
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
    FirebaseModule,
    NlpModule,

    // Infrastructure Modules
    KafkaModule.register({ enabled: isKafkaConfigured }),
    QdrantModule.register({ enabled: isQdrantConfigured }),
    HealthModule,
    SecurityModule,
    ...databaseModules,
    ...dashboardModules,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}