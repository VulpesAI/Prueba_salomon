import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { FinancialForecast } from './entities/financial-forecast.entity';

interface ForecastingEnginePoint {
  date: string;
  amount: number;
}

interface ForecastingEngineResponse {
  user_id: string;
  model_type: 'auto' | 'arima' | 'prophet';
  horizon_days: number;
  generated_at: string;
  history_days: number;
  forecasts: ForecastingEnginePoint[];
  metadata?: Record<string, any>;
}

export interface ForecastSummary {
  modelType: string;
  generatedAt: string;
  horizonDays: number;
  historyDays: number;
  forecasts: { date: string; amount: number }[];
  trend: {
    direction: 'upward' | 'downward' | 'stable';
    change: number;
    changePercentage: number;
  };
  metadata?: Record<string, any>;
}

@Injectable()
export class FinancialForecastsService {
  private readonly logger = new Logger(FinancialForecastsService.name);
  private readonly baseUrl: string;
  private readonly defaultHorizon: number;

  constructor(
    @InjectRepository(FinancialForecast)
    private readonly forecastsRepository: Repository<FinancialForecast>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.baseUrl =
      this.configService.get<string>('app.forecasting.engineUrl') ||
      this.configService.get<string>('FORECASTING_ENGINE_URL', 'http://forecasting-engine:8003');
    this.defaultHorizon =
      this.configService.get<number>('app.forecasting.horizonDays') ||
      this.configService.get<number>('FORECASTING_DEFAULT_HORIZON_DAYS', 30);
  }

  async refreshForecastsForUser(userId: string, horizon: number = this.defaultHorizon, model: 'auto' | 'arima' | 'prophet' = 'auto'): Promise<ForecastSummary | null> {
    try {
      const response = await this.fetchForecastsFromEngine(userId, horizon, model);
      await this.persistForecasts(userId, response);
      const summary = this.toSummary(response);
      this.eventEmitter.emit('metrics.updated', {
        userId,
        category: 'financial-forecast',
        summary,
      });
      return summary;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `No fue posible actualizar proyecciones para el usuario ${userId}: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
      return null;
    }
  }

  async getForecastSummary(userId: string): Promise<ForecastSummary | null> {
    const records = await this.forecastsRepository.find({
      where: { user: { id: userId } },
      order: { forecastDate: 'ASC' },
    });

    if (records.length === 0) {
      return null;
    }

    const first = records[0];
    const last = records[records.length - 1];
    const forecasts = records.map((forecast) => ({
      date: forecast.forecastDate.toISOString().split('T')[0],
      amount: Number(forecast.predictedValue),
    }));

    const change = Number(last.predictedValue) - Number(first.predictedValue);
    const base = Number(first.predictedValue) === 0 ? 1 : Number(first.predictedValue);
    const changePercentage = (change / base) * 100;
    const direction: 'upward' | 'downward' | 'stable' =
      changePercentage > 5 ? 'upward' : changePercentage < -5 ? 'downward' : 'stable';

    return {
      modelType: first.modelType,
      generatedAt: first.generatedAt.toISOString(),
      horizonDays: first.horizonDays,
      historyDays: (first.metadata as any)?.history_days ?? forecasts.length,
      forecasts,
      trend: {
        direction,
        change: Number(change.toFixed(2)),
        changePercentage: Number(changePercentage.toFixed(2)),
      },
      metadata: first.metadata ?? undefined,
    };
  }

  async getForecastSeries(userId: string): Promise<FinancialForecast[]> {
    return this.forecastsRepository.find({
      where: { user: { id: userId } },
      order: { forecastDate: 'ASC' },
    });
  }

  private async fetchForecastsFromEngine(userId: string, horizon: number, model: 'auto' | 'arima' | 'prophet'): Promise<ForecastingEngineResponse> {
    const response = await firstValueFrom(
      this.httpService.get<ForecastingEngineResponse>(`${this.baseUrl}/forecasts/${userId}`, {
        params: { horizon, model },
        timeout: 25000,
      }),
    );

    return response.data;
  }

  private async persistForecasts(userId: string, forecast: ForecastingEngineResponse): Promise<void> {
    await this.forecastsRepository
      .createQueryBuilder()
      .delete()
      .where('user_id = :userId', { userId })
      .execute();

    const entries = forecast.forecasts.map((point) =>
      this.forecastsRepository.create({
        user: { id: userId } as any,
        forecastDate: new Date(point.date),
        predictedValue: point.amount,
        modelType: forecast.model_type,
        horizonDays: forecast.horizon_days,
        generatedAt: new Date(forecast.generated_at),
        metadata: {
          ...(forecast.metadata ?? {}),
          history_days: forecast.history_days,
        },
      }),
    );

    if (entries.length > 0) {
      await this.forecastsRepository.save(entries);
    }
  }

  private toSummary(response: ForecastingEngineResponse): ForecastSummary {
    const forecasts = response.forecasts.map((point) => ({
      date: point.date,
      amount: Number(point.amount),
    }));

    const change = forecasts.length > 0 ? forecasts[forecasts.length - 1].amount - forecasts[0].amount : 0;
    const base = forecasts.length > 0 ? (forecasts[0].amount === 0 ? 1 : forecasts[0].amount) : 1;
    const changePercentage = (change / base) * 100;
    const direction: 'upward' | 'downward' | 'stable' =
      changePercentage > 5 ? 'upward' : changePercentage < -5 ? 'downward' : 'stable';

    return {
      modelType: response.model_type,
      generatedAt: response.generated_at,
      horizonDays: response.horizon_days,
      historyDays: response.history_days,
      forecasts,
      trend: {
        direction,
        change: Number(change.toFixed(2)),
        changePercentage: Number(changePercentage.toFixed(2)),
      },
      metadata: response.metadata,
    };
  }
}
