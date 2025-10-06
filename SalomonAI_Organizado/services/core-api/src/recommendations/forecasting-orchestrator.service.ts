import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { fetch } from 'undici';

import { SupabaseService } from '../auth/supabase.service';
import type { ForecastingConfig } from '../config/configuration';

interface ForecastResponsePoint {
  date: string;
  amount: number;
}

interface ForecastEngineResponse {
  user_id: string;
  model_type: 'arima' | 'prophet' | 'auto';
  horizon_days: number;
  generated_at: string;
  history_days: number;
  forecasts: ForecastResponsePoint[];
  metadata: Record<string, unknown> | null;
}

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

  async generateForecast(userId: string): Promise<void> {
    if (!this.config?.baseUrl || !this.config.enabled) {
      this.logger.debug('Forecasting engine is disabled or not configured. Skipping forecast generation.');
      return;
    }

    try {
      const response = await this.callForecastingEngine(userId);
      await this.persistForecastResult(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to generate forecast for user ${userId}: ${message}`);
    }
  }

  private async callForecastingEngine(userId: string): Promise<ForecastEngineResponse> {
    const baseUrl = this.getForecastingBaseUrl();

    const url = new URL(`/forecasts/${encodeURIComponent(userId)}`, baseUrl);

    if (this.config?.defaultHorizonDays) {
      url.searchParams.set('horizon', String(this.config.defaultHorizonDays));
    }

    if (this.config?.defaultModel) {
      url.searchParams.set('model', this.config.defaultModel);
    }

    const timeoutMs = Math.max(this.config?.timeoutMs ?? 10000, 1000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Forecasting engine responded with ${response.status}: ${text || response.statusText}`);
      }

      const payload = (await response.json()) as ForecastEngineResponse;
      return payload;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async persistForecastResult(payload: ForecastEngineResponse): Promise<void> {
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
}
