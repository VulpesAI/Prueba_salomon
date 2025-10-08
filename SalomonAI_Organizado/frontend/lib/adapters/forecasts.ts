import { ForecastPoint, ForecastResponse, Horizon } from '@/types/forecasts';

const HISTORY_DAYS = 90;
const BASE_DATE = Date.UTC(2025, 0, 1);
const DAY_MS = 86_400_000;
const BASE_VALUE = 850_000;

const MODEL_TYPE = 'prophet-v2';
const CALCULATED_AT = new Date(Date.UTC(2025, 4, 15, 10, 30, 0)).toISOString();

function dateAt(index: number): string {
  return new Date(BASE_DATE + index * DAY_MS).toISOString();
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function seasonalComponent(index: number) {
  return Math.sin(index / 5) * 40_000 + Math.cos(index / 9) * 18_000;
}

function trendComponent(index: number) {
  return index * 2_400;
}

function valueAt(index: number) {
  const base = BASE_VALUE + trendComponent(index) + seasonalComponent(index);
  return round(base);
}

function buildHistory(): ForecastPoint[] {
  return Array.from({ length: HISTORY_DAYS }, (_, idx) => ({
    ts: dateAt(idx),
    value: valueAt(idx),
    kind: 'HIST',
  }));
}

function buildForecast(horizon: Horizon): ForecastPoint[] {
  return Array.from({ length: horizon }, (_, offset) => {
    const index = HISTORY_DAYS + offset;
    const value = valueAt(index);
    const spread = Math.max(0.05 * value, 25_000);
    const lo = round(Math.max(0, value - spread));
    const hi = round(value + spread);

    return {
      ts: dateAt(index),
      value,
      kind: 'FCST',
      lo,
      hi,
    };
  });
}

export async function getForecast(horizon: Horizon): Promise<ForecastResponse> {
  const history = buildHistory();
  const projection = buildForecast(horizon);

  return {
    horizon,
    model_type: MODEL_TYPE,
    calculated_at: CALCULATED_AT,
    points: [...history, ...projection],
  };
}
