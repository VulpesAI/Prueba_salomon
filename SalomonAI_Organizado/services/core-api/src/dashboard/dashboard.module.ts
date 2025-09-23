import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { FinancialMovementsModule } from '../financial-movements/financial-movements.module';

@Module({
  imports: [FinancialMovementsModule],
  controllers: [DashboardController],
  providers: [],
  exports: [],
})
export class DashboardModule {}
