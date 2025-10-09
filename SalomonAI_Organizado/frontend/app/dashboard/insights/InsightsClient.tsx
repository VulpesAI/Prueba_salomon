"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";

import { AlertTriangle, Brain, RefreshCcw } from "lucide-react";

import { Breadcrumbs } from "@/components/authenticated/breadcrumbs";
import { InsightsKpis } from "@/components/insights/InsightsKpis";
import { HistoricalBalances } from "@/components/insights/HistoricalBalances";
import { Recommendations } from "@/components/insights/Recommendations";
import { TopCategoriesChart } from "@/components/insights/TopCategoriesChart";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInsights } from "@/hooks/useInsights";
import { INSIGHT_RANGE_OPTIONS, type InsightRange } from "@/lib/insights/types";
import { useSettings } from "@/lib/settings/context";

function InsightsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={`kpi-skeleton-${index}`} className="h-32 w-full rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Skeleton className="h-[360px] w-full rounded-2xl" />
        <Skeleton className="h-[360px] w-full rounded-2xl" />
      </div>
    </div>
  );
}

export default function InsightsClient() {
  const { settings } = useSettings();
  const { data, error, loading, lastUpdated, range, refresh } = useInsights();

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(settings.language ?? "es-CL", {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0,
      }),
    [settings.language],
  );

  const percentFormatter = useMemo(
    () =>
      new Intl.NumberFormat(settings.language ?? "es-CL", {
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    [settings.language],
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(settings.language ?? "es-CL", {
        day: "2-digit",
        month: "short",
        timeZone: settings.timeZone ?? "America/Santiago",
      }),
    [settings.language, settings.timeZone],
  );

  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(settings.language ?? "es-CL", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: settings.timeZone ?? "America/Santiago",
      }),
    [settings.language, settings.timeZone],
  );

  const formatCurrency = useCallback((value: number) => currencyFormatter.format(value), [currencyFormatter]);
  const formatPercent = useCallback((value: number) => percentFormatter.format(value), [percentFormatter]);
  const formatDateLabel = useCallback(
    (value: string) => {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
    },
    [dateFormatter],
  );
  const formatDateTime = useCallback(
    (value: string) => {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date);
    },
    [dateTimeFormatter],
  );

  const rangeLabel = useMemo(
    () => INSIGHT_RANGE_OPTIONS.find((option) => option.value === range)?.label ?? "Últimos 30 días",
    [range],
  );

  const isRefreshing = loading && Boolean(data);
  const showSkeleton = loading && !data;
  const isEmpty = !loading && data
    ? data.kpis.length === 0 &&
      data.topCategories.length === 0 &&
      data.history.length === 0 &&
      data.recommendations.length === 0
    : false;

  const statusMessage = showSkeleton
    ? "Cargando insights financieros"
    : error
      ? `Error al cargar insights: ${error}`
      : lastUpdated
        ? `Insights actualizados el ${formatDateTime(lastUpdated)}`
        : "Insights listos";

  const handleRangeChange = (nextValue: string) => {
    void refresh(nextValue as InsightRange);
  };

  const handleRefresh = () => {
    void refresh();
  };

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumbs />
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Brain className="h-5 w-5" aria-hidden />
            </span>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Insights</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Análisis de tus finanzas con inteligencia artificial.
          </p>
        </div>
        <Tabs
          value={range}
          onValueChange={handleRangeChange}
          className="max-w-xs"
          aria-label="Selecciona el intervalo de análisis"
        >
          <TabsList className="grid grid-cols-2 gap-2 rounded-full bg-muted/50 p-1">
            {INSIGHT_RANGE_OPTIONS.map((option) => (
              <TabsTrigger
                key={option.value}
                value={option.value}
                className="rounded-full text-xs font-medium"
              >
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </header>

      <div className="sr-only" role="status" aria-live="polite">
        {statusMessage}
      </div>

      {showSkeleton ? (
        <InsightsSkeleton />
      ) : error && !data ? (
        <Alert variant="destructive" className="rounded-2xl border border-border/60 bg-card">
          <AlertTriangle className="h-5 w-5" aria-hidden />
          <AlertTitle>No pudimos cargar tus insights</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{error}</span>
            <Button variant="outline" onClick={handleRefresh}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : isEmpty ? (
        <Card className="rounded-2xl border border-border/60 bg-card">
          <CardHeader>
            <CardTitle>Aún no hay suficiente información para generar insights</CardTitle>
            <CardDescription>
              Agrega o sincroniza transacciones para que la IA pueda analizar tus patrones financieros.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/transactions">Agregar transacciones</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        data && (
          <div className="space-y-6">
            <InsightsKpis
              kpis={data.kpis}
              formatCurrency={formatCurrency}
              formatPercent={formatPercent}
            />
            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <div className="space-y-6">
                <TopCategoriesChart
                  data={data.topCategories}
                  formatCurrency={formatCurrency}
                  formatPercent={formatPercent}
                />
                <HistoricalBalances
                  data={data.history}
                  formatCurrency={formatCurrency}
                  formatDateLabel={formatDateLabel}
                />
              </div>
              <div className="space-y-6">
                <Recommendations data={data.recommendations} voice={settings.voice} />
                <Card className="rounded-2xl border border-border/60 bg-card">
                  <CardHeader className="space-y-1">
                    <CardTitle>Actualización de datos</CardTitle>
                    <CardDescription>
                      {lastUpdated
                        ? `Última sincronización ${formatDateTime(lastUpdated)} · ${rangeLabel}`
                        : `Intervalo seleccionado: ${rangeLabel}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between gap-4">
                    <div className="text-sm text-muted-foreground">
                      {isRefreshing
                        ? "Actualizando insights con tus preferencias"
                        : "Mantén tus insights alineados con tus movimientos."}
                    </div>
                    <Button
                      onClick={handleRefresh}
                      variant="outline"
                      disabled={loading}
                      aria-label="Actualizar datos de insights"
                    >
                      <RefreshCcw
                        className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                        aria-hidden
                      />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
