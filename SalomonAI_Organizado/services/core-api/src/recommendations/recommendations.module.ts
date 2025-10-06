import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module';
import { ForecastingOrchestratorService } from './forecasting-orchestrator.service';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsGatewayService } from './recommendations-gateway.service';
import { RecommendationsIngestionController } from './recommendations-ingestion.controller';
import { RecommendationsIngestionService } from './recommendations-ingestion.service';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [RecommendationsController, RecommendationsIngestionController],
  providers: [
    RecommendationsGatewayService,
    RecommendationsIngestionService,
    ForecastingOrchestratorService,
  ],
  exports: [RecommendationsIngestionService, ForecastingOrchestratorService],
})
export class RecommendationsModule {}
