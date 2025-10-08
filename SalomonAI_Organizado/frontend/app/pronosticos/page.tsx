'use client';

import { useState } from 'react';

import HorizonSelector from './_components/HorizonSelector';
import ForecastChart from './_components/ForecastChart';
import LegendNote from './_components/LegendNote';
import StatsCards from './_components/StatsCards';

import { useForecast } from '@/lib/hooks/useForecast';
import { Horizon } from '@/types/forecasts';

export default function PronosticosPage() {
  const [horizon, setHorizon] = useState<Horizon>(30);
  const { data, isLoading, isError, error, refetch, isFetching } = useForecast(horizon);

  const isEmpty = data?.points.length === 0;
  const showSkeleton = isLoading || (isFetching && !data);

  return (
    <main className="container space-y-6 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Pronósticos</h1>
        <HorizonSelector value={horizon} onChange={setHorizon} />
      </div>

      {showSkeleton && (
        <div
          className="h-80 rounded-xl border bg-muted/40 animate-pulse"
          aria-live="polite"
          aria-busy="true"
        />
      )}

      {isError && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive-foreground">
          <p className="font-medium">Error: {(error as Error).message}</p>
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
            onClick={() => refetch()}
          >
            Reintentar
          </button>
        </div>
      )}

      {isEmpty && !showSkeleton && (
        <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
          Sin datos para el horizonte seleccionado.
        </div>
      )}

      {data && !isEmpty && (
        <div className="space-y-6">
          <ForecastChart data={data} />
          <StatsCards data={data} />
          <LegendNote data={data} />
        </div>
      )}
    </main>
  );
}
