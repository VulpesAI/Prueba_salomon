import { Module } from '@nestjs/common';

import { AlertsController } from './alerts.controller';
import { PredictiveAlertsService } from './predictive-alerts.service';
import { FinancialForecastsModule } from '../financial-forecasts/financial-forecasts.module';

@Module({
  imports: [FinancialForecastsModule],
  controllers: [AlertsController],
  providers: [PredictiveAlertsService],
  exports: [PredictiveAlertsService],
})
export class AlertsModule {}
