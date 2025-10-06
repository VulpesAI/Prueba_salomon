import {
  HttpException,
  Injectable,
  Logger,
  RequestTimeoutException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetch } from 'undici';

import type { ForecastingConfig } from '../config/configuration';
import type {
  ForecastingEngineResponse,
  ForecastingPointDto,
  ForecastingRequestOptions,
  ForecastingResponseDto,
} from '../forecasting/forecasting.types';
import { FORECASTING_MODELS } from './dto/dashboard-projection-query.dto';

@Injectable()
export class DashboardForecastingGatewayService {
  private readonly logger = new Logger(DashboardForecastingGatewayService.name);
  private readonly config: ForecastingConfig | undefined;

  constructor(private readonly configService: ConfigService) {
    this.config = this.configService.get<ForecastingConfig>('forecasting', { infer: true });
  }

  async fetchForecast(
    userId: string,
    options: ForecastingRequestOptions = {},
  ): Promise<ForecastingResponseDto> {
    if (!this.config?.baseUrl) {
      throw new ServiceUnavailableException('Forecasting engine URL is not configured');
    }

    const timeoutMs = Math.max(this.config.timeoutMs ?? 10000, 1000);
    const url = new URL(`/forecasts/${encodeURIComponent(userId)}`, this.config.baseUrl);

    if (options.horizonDays) {
      url.searchParams.set('horizon', String(Math.max(1, options.horizonDays)));
    } else if (this.config.defaultHorizonDays) {
      url.searchParams.set('horizon', String(this.config.defaultHorizonDays));
    }

    const model = this.normalizeModel(options.model ?? this.config?.defaultModel ?? null);
    if (model) {
      url.searchParams.set('model', model);
    }

    if (options.refresh) {
      url.searchParams.set('refresh', 'true');
    }

    const forecastType = this.normalizeForecastType(options.forecastType ?? null);
    if (forecastType) {
      url.searchParams.set('forecast_type', forecastType);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new HttpException(
          `Forecasting engine error (${response.status}): ${text || response.statusText}`,
          response.status,
        );
      }

      const data = (await response.json()) as ForecastingEngineResponse;
      return this.normalizeResponse(data);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new RequestTimeoutException('Forecasting engine request timed out');
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to contact forecasting engine: ${message}`);
      throw new ServiceUnavailableException('Forecasting engine is unavailable');
    } finally {
      clearTimeout(timeout);
    }
  }

  private normalizeResponse(payload: ForecastingEngineResponse): ForecastingResponseDto {
    const points = Array.isArray(payload.forecasts)
      ? payload.forecasts
          .filter((point) => point && typeof point.date === 'string')
          .map<ForecastingPointDto>((point) => ({
            date: new Date(point.date).toISOString(),
            amount: Number(point.amount ?? 0),
          }))
          .sort((a, b) => a.date.localeCompare(b.date))
      : [];

    return {
      userId: payload.user_id,
      modelType: payload.model_type,
      horizonDays: payload.horizon_days,
      generatedAt: new Date(payload.generated_at).toISOString(),
      historyDays: payload.history_days,
      points,
      metadata: payload.metadata ?? null,
      source: 'forecasting-engine',
    } satisfies ForecastingResponseDto;
  }

  private normalizeModel(model: string | null): ForecastingResponseDto['modelType'] | null {
    if (!model) {
      return null;
    }

    const normalized = model.toLowerCase();
    return (FORECASTING_MODELS.find((entry) => entry === normalized) ?? null) as
      | ForecastingResponseDto['modelType']
      | null;
  }

  private normalizeForecastType(type: string | null): string | null {
    if (!type) {
      return null;
    }

    const trimmed = type.trim();
    if (!trimmed) {
      return null;
    }

    return trimmed.slice(0, 128);
  }
}
