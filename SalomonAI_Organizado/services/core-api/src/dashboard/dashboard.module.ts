import { DynamicModule, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DashboardController } from './dashboard.controller';
import { FinancialMovementsModule } from '../financial-movements/financial-movements.module';
import { FinancialForecastsModule } from '../financial-forecasts/financial-forecasts.module';
import { GoalsModule } from '../goals/goals.module';
import { RecommendationsService } from './recommendations.service';
import { NoopRecommendationsService } from './noop-recommendations.service';
import { RECOMMENDATIONS_SERVICE } from './recommendations.tokens';

@Module({})
export class DashboardModule {
  static register(options: { recommendationsEnabled: boolean }): DynamicModule {
    const httpModule = options.recommendationsEnabled
      ? [
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
        ]
      : [];

    const providers = options.recommendationsEnabled
      ? [
          RecommendationsService,
          {
            provide: RECOMMENDATIONS_SERVICE,
            useExisting: RecommendationsService,
          },
        ]
      : [
          NoopRecommendationsService,
          {
            provide: RECOMMENDATIONS_SERVICE,
            useExisting: NoopRecommendationsService,
          },
        ];

    return {
      module: DashboardModule,
      imports: [FinancialMovementsModule, FinancialForecastsModule, GoalsModule, ConfigModule, ...httpModule],
      controllers: [DashboardController],
      providers,
      exports: [RECOMMENDATIONS_SERVICE],
    };
  }
}
