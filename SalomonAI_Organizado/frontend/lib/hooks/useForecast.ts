import { useQuery } from '@tanstack/react-query';

import { ForecastResponse, Horizon } from '@/types/forecasts';

async function fetchForecast(horizon: Horizon): Promise<ForecastResponse> {
  const res = await fetch(`/api/forecasts?horizon=${horizon}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Error al cargar pronóstico');
  }
  return res.json();
}

export function useForecast(horizon: Horizon) {
  return useQuery({
    queryKey: ['forecast', horizon],
    queryFn: () => fetchForecast(horizon),
    staleTime: 60_000,
  });
}
