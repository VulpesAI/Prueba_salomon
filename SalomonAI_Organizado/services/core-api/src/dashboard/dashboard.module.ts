import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardForecastingGatewayService } from './forecasting-gateway.service';
import { DashboardRecommendationsGatewayService } from './recommendations-gateway.service';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardForecastingGatewayService, DashboardRecommendationsGatewayService],
  exports: [DashboardService, DashboardForecastingGatewayService, DashboardRecommendationsGatewayService],
})
export class DashboardModule {}
