import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { RecommendationsModule } from '../recommendations/recommendations.module';
import { ForecastingController } from './forecasting.controller';

@Module({
  imports: [AuthModule, RecommendationsModule],
  controllers: [ForecastingController],
})
export class ForecastingModule {}
