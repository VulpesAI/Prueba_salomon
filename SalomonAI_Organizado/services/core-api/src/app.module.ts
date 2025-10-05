import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { StatementsModule } from './statements/statements.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { MovementsModule } from './movements/movements.module';
import { BelvoModule } from './belvo/belvo.module';
import { ResultsConnectorModule } from './connectors/results/results-connector.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
      validationSchema: envValidationSchema,
    }),
    HealthModule,
    AuthModule,
    StatementsModule,
    DashboardModule,
    MovementsModule,
    BelvoModule,
    ResultsConnectorModule,
  ],
})
export class AppModule {}
