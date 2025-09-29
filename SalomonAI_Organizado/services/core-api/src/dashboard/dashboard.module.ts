import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DashboardController } from './dashboard.controller';
import { FinancialMovementsModule } from '../financial-movements/financial-movements.module';
import { FinancialForecastsModule } from '../financial-forecasts/financial-forecasts.module';
import { GoalsModule } from '../goals/goals.module';
import { RecommendationsService } from './recommendations.service';

@Module({
  imports: [
    FinancialMovementsModule,
    FinancialForecastsModule,
    GoalsModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        baseURL:
          (configService.get('app.recommendations') as { engineUrl?: string } | undefined)?.engineUrl ||
          configService.get<string>('RECOMMENDATION_ENGINE_URL', 'http://recommendation-engine:8004'),
        timeout:
          (configService.get('app.recommendations') as { timeoutMs?: number } | undefined)?.timeoutMs ||
          configService.get<number>('RECOMMENDATION_ENGINE_TIMEOUT_MS', 8000),
      }),
    }),
  ],
  controllers: [DashboardController],
  providers: [RecommendationsService],
  exports: [RecommendationsService],
})
export class DashboardModule {}
