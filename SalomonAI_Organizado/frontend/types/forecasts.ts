export type Horizon = 7 | 30 | 90;

export interface ForecastPoint {
  ts: string;
  value: number;
  kind: 'HIST' | 'FCST';
  lo?: number | null;
  hi?: number | null;
}

export interface ForecastResponse {
  horizon: Horizon;
  model_type: string;
  calculated_at: string;
  points: ForecastPoint[];
}
