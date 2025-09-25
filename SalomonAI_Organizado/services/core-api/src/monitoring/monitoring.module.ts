import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MetricsController } from './metrics.controller';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsService } from './metrics.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [MetricsService, MetricsInterceptor],
  controllers: [MetricsController],
  exports: [MetricsService, MetricsInterceptor],
})
export class MonitoringModule {}
