import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { FinancialMovementsModule } from '../financial-movements/financial-movements.module';
import { FinancialForecastsModule } from '../financial-forecasts/financial-forecasts.module';

@Module({
  imports: [FinancialMovementsModule, FinancialForecastsModule],
  controllers: [DashboardController],
  providers: [],
  exports: [],
})
export class DashboardModule {}
