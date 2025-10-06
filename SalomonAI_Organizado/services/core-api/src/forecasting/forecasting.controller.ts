import {
  Controller,
  Param,
  Post,
  Query,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';

import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { ForecastingOrchestratorService } from '../recommendations/forecasting-orchestrator.service';
import type { ForecastingResponseDto } from './forecasting.types';
import { ForecastingTriggerQueryDto } from './dto/forecasting-trigger-query.dto';

@UseGuards(SupabaseAuthGuard)
@Controller('forecasting')
export class ForecastingController {
  constructor(private readonly forecastingService: ForecastingOrchestratorService) {}

  @Post(':userId/refresh')
  async refreshForecast(
    @Param('userId') userId: string,
    @Query() query: ForecastingTriggerQueryDto,
  ): Promise<ForecastingResponseDto> {
    const response = await this.forecastingService.generateForecast(userId, {
      horizonDays: query.horizonDays,
      model: query.model,
      refresh: query.refresh,
    });

    if (!response) {
      throw new ServiceUnavailableException('Forecasting engine is unavailable');
    }

    return response;
  }
}
