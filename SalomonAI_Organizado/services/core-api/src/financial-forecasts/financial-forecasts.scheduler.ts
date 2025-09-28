import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

import { FinancialForecastsService } from './financial-forecasts.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class FinancialForecastsScheduler {
  private readonly logger = new Logger(FinancialForecastsScheduler.name);
  private readonly horizonDays: number;

  constructor(
    private readonly forecastsService: FinancialForecastsService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {
    this.horizonDays =
      this.configService.get<number>('app.forecasting.horizonDays') ||
      this.configService.get<number>('FORECASTING_DEFAULT_HORIZON_DAYS', 30);
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async refreshForecastsForUsers(): Promise<void> {
    const { users } = await this.usersService.findAll(1000, 0);
    this.logger.log(`Iniciando recalculo de proyecciones para ${users.length} usuarios`);

    for (const user of users.filter((item) => item.isActive)) {
      try {
        await this.forecastsService.refreshForecastsForUser(user.id, this.horizonDays);
      } catch (error) {
        this.logger.warn(`Fallo al recalcular proyección para usuario ${user.id}`, error instanceof Error ? error.stack : undefined);
      }
    }

    this.logger.log('Finalizó la tarea programada de proyecciones financieras');
  }
}
