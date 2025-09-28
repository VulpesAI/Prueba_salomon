import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { FinancialMovementsModule } from '../financial-movements/financial-movements.module';
import { FinancialForecastsModule } from '../financial-forecasts/financial-forecasts.module';
import { GoalsModule } from '../goals/goals.module';

@Module({
  imports: [FinancialMovementsModule, FinancialForecastsModule, GoalsModule],
  controllers: [DashboardController],
  providers: [],
  exports: [],
})
export class DashboardModule {}
