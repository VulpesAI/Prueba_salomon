export type ForecastingModelType = 'auto' | 'arima' | 'prophet';

export interface ForecastingPointDto {
  date: string;
  amount: number;
}

export interface ForecastingResponseDto {
  userId: string;
  modelType: ForecastingModelType;
  horizonDays: number;
  generatedAt: string;
  historyDays: number;
  points: ForecastingPointDto[];
  metadata: Record<string, unknown> | null;
  source: 'forecasting-engine';
}

export interface ForecastingEngineResponse {
  user_id: string;
  model_type: ForecastingModelType;
  horizon_days: number;
  generated_at: string;
  history_days: number;
  forecasts: Array<{ date: string; amount: number }>;
  metadata: Record<string, unknown> | null;
}

export interface ForecastingRequestOptions {
  horizonDays?: number;
  model?: string;
  refresh?: boolean;
  forecastType?: string;
}
