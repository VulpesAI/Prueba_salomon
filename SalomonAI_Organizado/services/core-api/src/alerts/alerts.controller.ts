import { Controller, Get, Request, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PredictiveAlertsService } from './predictive-alerts.service';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly predictiveAlertsService: PredictiveAlertsService) {}

  @Get('predictive')
  @UseGuards(JwtAuthGuard)
  async getPredictiveAlerts(@Request() req) {
    const userId = req.user.id;
    const alerts = await this.predictiveAlertsService.generateAlerts(userId);
    return { alerts };
  }
}
