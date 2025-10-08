import { NextRequest } from 'next/server';

import { getForecast } from '@/lib/adapters/forecasts';
import { ForecastResponse, Horizon } from '@/types/forecasts';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const requested = Number(searchParams.get('horizon') ?? '30') as Horizon;
  const horizon: Horizon = [7, 30, 90].includes(requested) ? requested : 30;

  const data: ForecastResponse = await getForecast(horizon);
  return Response.json(data, { status: 200 });
}
