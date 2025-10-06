import { Controller, Get, Query } from '@nestjs/common';

import { DashboardService } from './dashboard.service';
import { DashboardResumenQueryDto } from './dto/dashboard-resumen-query.dto';
import { DashboardSummaryQueryDto } from './dto/dashboard-summary-query.dto';

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
}
