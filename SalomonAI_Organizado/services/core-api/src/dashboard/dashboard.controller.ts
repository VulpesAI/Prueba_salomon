import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';

import { DashboardService } from './dashboard.service';
import { DashboardSummaryQueryDto } from './dto/dashboard-summary-query.dto';
import { DashboardProjectionQueryDto } from './dto/dashboard-projection-query.dto';
import { DashboardRecommendationsQueryDto } from './dto/dashboard-recommendations-query.dto';
import { DashboardRecommendationFeedbackDto } from './dto/dashboard-recommendation-feedback.dto';
import { SupabaseJwtGuard } from '../auth/supabase.guard';

@UseGuards(SupabaseJwtGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('resumen')
  resumen(@Req() req: { user: { sub: string } }) {
    return this.dashboardService.getResumenForUser(req.user.sub);
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
