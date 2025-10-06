import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { DashboardService } from './dashboard.service';
import { DashboardResumenQueryDto } from './dto/dashboard-resumen-query.dto';
import { DashboardSummaryQueryDto } from './dto/dashboard-summary-query.dto';
import { DashboardProjectionQueryDto } from './dto/dashboard-projection-query.dto';
import { DashboardRecommendationsQueryDto } from './dto/dashboard-recommendations-query.dto';
import { DashboardRecommendationFeedbackDto } from './dto/dashboard-recommendation-feedback.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('resumen')
  getResumen(@Query() query: DashboardResumenQueryDto) {
    return this.dashboardService.getResumen(query);
  }

  @Get('summary')
  getSummary(@Query() query: DashboardSummaryQueryDto) {
    return this.dashboardService.getSummary(query);
  }

  @Get('proyeccion')
  getProjection(@Query() query: DashboardProjectionQueryDto) {
    return this.dashboardService.getProjection(query);
  }

  @Get('recomendaciones')
  getRecommendations(@Query() query: DashboardRecommendationsQueryDto) {
    return this.dashboardService.getRecommendations(query);
  }

  @Post('recomendaciones/feedback')
  submitRecommendationFeedback(@Body() payload: DashboardRecommendationFeedbackDto) {
    return this.dashboardService.submitRecommendationFeedback(payload);
  }
}
