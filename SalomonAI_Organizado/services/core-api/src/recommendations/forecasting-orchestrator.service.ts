import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { fetch } from 'undici';

import { SupabaseService } from '../auth/supabase.service';
import type { ForecastingConfig } from '../config/configuration';
import type {
  ForecastingEngineResponse,
  ForecastingRequestOptions,
  ForecastingResponseDto,
} from '../forecasting/forecasting.types';
import { FORECASTING_MODELS } from '../dashboard/dto/dashboard-projection-query.dto';

@Injectable()
export class ForecastingOrchestratorService {
  private readonly logger = new Logger(ForecastingOrchestratorService.name);
  private readonly config: ForecastingConfig | undefined;

  constructor(
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
  ) {
    this.config = this.configService.get<ForecastingConfig>('forecasting', { infer: true });
  }

  async generateForecast(
    userId: string,
    options: ForecastingRequestOptions = {},
  ): Promise<ForecastingResponseDto | null> {
    if (!this.config?.baseUrl || !this.config.enabled) {
      this.logger.debug(
        'Forecasting engine is disabled or not configured. Skipping forecast generation.',
      );
      return null;
    }

    try {
      const response = await this.callForecastingEngine(userId, options);
      await this.persistForecastResult(response);
      return this.normalizeResponse(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to generate forecast for user ${userId}: ${message}`);
      return null;
    }
  }

  private async callForecastingEngine(
    userId: string,
    options: ForecastingRequestOptions,
  ): Promise<ForecastingEngineResponse> {
    const baseUrl = this.getForecastingBaseUrl();

    const url = new URL(`/forecasts/${encodeURIComponent(userId)}`, baseUrl);

    const horizon = options.horizonDays ?? this.config?.defaultHorizonDays;
    if (typeof horizon === 'number' && Number.isFinite(horizon)) {
      url.searchParams.set('horizon', String(Math.max(1, Math.floor(horizon))));
    }

    const model = this.normalizeModel(options.model ?? this.config?.defaultModel ?? null);
    if (model) {
      url.searchParams.set('model', model);
    }

    if (options.refresh) {
      url.searchParams.set('refresh', 'true');
    }

    const timeoutMs = Math.max(this.config?.timeoutMs ?? 10000, 1000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `Forecasting engine responded with ${response.status}: ${text || response.statusText}`,
        );
      }

      const payload = (await response.json()) as ForecastingEngineResponse;
      return payload;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async persistForecastResult(payload: ForecastingEngineResponse): Promise<void> {
    if (!this.supabaseService.isEnabled()) {
      this.logger.debug('Supabase is not configured; skipping forecast persistence.');
      return;
    }

    const generatedAtIso = new Date(payload.generated_at).toISOString();
    const recordId = payload.user_id || randomUUID();

    try {
      await this.supabaseService.upsertForecastResult({
        id: recordId,
        userId: payload.user_id,
        generatedAt: generatedAtIso,
        horizonDays: payload.horizon_days,
        historyDays: payload.history_days,
        modelType: payload.model_type,
        metadata: payload.metadata ?? null,
        points: payload.forecasts.map((point) => ({
          date: point.date,
          amount: point.amount,
        })),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to persist forecast for user ${payload.user_id}: ${message}`);
    }
  }

  private getForecastingBaseUrl(): string {
    const baseUrl = this.config?.baseUrl;
    if (!baseUrl) {
      throw new Error('Forecasting engine base URL is not configured.');
    }

    return baseUrl;
  }

  private normalizeResponse(payload: ForecastingEngineResponse): ForecastingResponseDto {
    const points = Array.isArray(payload.forecasts)
      ? payload.forecasts
          .filter((point) => point && typeof point.date === 'string')
          .map((point) => ({
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

  private normalizeModel(model: string | null): ForecastingEngineResponse['model_type'] | null {
    if (!model) {
      return null;
    }

    const normalized = model.toLowerCase();
    return (FORECASTING_MODELS.find((entry) => entry === normalized) ?? null) as
      | ForecastingEngineResponse['model_type']
      | null;
  }
}
