import { Controller, Get, Header, HttpCode } from '@nestjs/common';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @HttpCode(200)
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async exposeMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }
}
