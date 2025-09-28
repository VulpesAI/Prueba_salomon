import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

import { FinancialForecast } from './entities/financial-forecast.entity';
import { FinancialForecastsService } from './financial-forecasts.service';
import { FinancialForecastsScheduler } from './financial-forecasts.scheduler';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialForecast]), HttpModule, ConfigModule, UsersModule],
  providers: [FinancialForecastsService, FinancialForecastsScheduler],
  exports: [FinancialForecastsService],
})
export class FinancialForecastsModule {}
