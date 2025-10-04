"use client"

import { useMemo } from "react"

import type {
  AnalyticsQuickAction,
  ForecastInsight,
  ForecastModelSummary,
  ForecastSchedule,
  ForecastSeriesPoint,
} from "@/types/analytics"

type UseAnalyticsForecastsResult = {
  series: ForecastSeriesPoint[]
  models: ForecastModelSummary[]
  schedules: ForecastSchedule[]
  insights: ForecastInsight[]
  actions: AnalyticsQuickAction[]
}

export const useAnalyticsForecasts = (): UseAnalyticsForecastsResult => {
  const series = useMemo<ForecastSeriesPoint[]>(
    () => [
      { date: "2024-01-01", actual: 48500000, forecast: 49000000, lower: 46200000, upper: 51800000 },
      { date: "2024-02-01", actual: 51200000, forecast: 50500000, lower: 47600000, upper: 53400000 },
      { date: "2024-03-01", actual: 52600000, forecast: 52300000, lower: 49800000, upper: 54800000 },
      { date: "2024-04-01", actual: 53900000, forecast: 53200000, lower: 50400000, upper: 56000000 },
      { date: "2024-05-01", actual: 54700000, forecast: 54500000, lower: 51600000, upper: 57400000 },
      { date: "2024-06-01", actual: null, forecast: 55800000, lower: 52900000, upper: 58700000 },
      { date: "2024-07-01", actual: null, forecast: 56500000, lower: 53400000, upper: 59600000 },
      { date: "2024-08-01", actual: null, forecast: 57200000, lower: 54100000, upper: 60300000 },
    ],
    []
  )

  const models = useMemo<ForecastModelSummary[]>(
    () => [
      { model: "Prophet estacional", horizon: "90 días", mape: 5.8, coverage: 93, status: "Activo" },
      { model: "ARIMA híbrido", horizon: "60 días", mape: 7.2, coverage: 89, status: "Revisar" },
      { model: "LSTM multivariante", horizon: "120 días", mape: 4.9, coverage: 95, status: "Entrenando" },
    ],
    []
  )

  const schedules = useMemo<ForecastSchedule[]>(
    () => [
      {
        id: "weekly-global",
        name: "Pronóstico consolidado",
        cadence: "Semanal · cada lunes",
        nextRun: "17 jun 2024 · 08:00",
        channel: "Email + webhook ERP",
      },
      {
        id: "daily-cashflow",
        name: "Proyección de caja",
        cadence: "Diario · 06:30",
        nextRun: "Mañana",
        channel: "Panel y Slack finanzas",
      },
      {
        id: "monthly-opex",
        name: "Escenario OPEX",
        cadence: "Mensual · 1er día",
        nextRun: "01 jul 2024",
        channel: "Dashboard planificación",
      },
    ],
    []
  )

  const insights = useMemo<ForecastInsight[]>(
    () => [
      {
        id: "variance-gain",
        title: "Reducción de error",
        summary: "El error absoluto medio cayó 1.3 pp gracias al ajuste de estacionalidad por campañas.",
        recommendation: "Consolida este modelo como base y replica los parámetros en el segmento retail.",
      },
      {
        id: "demand-spike",
        title: "Pico proyectado",
        summary: "Se anticipa un pico de demanda la semana 29 con 8% sobre tendencia.",
        recommendation: "Coordina abastecimiento y actualiza acuerdos de nivel de servicio con proveedores.",
      },
      {
        id: "coverage-alert",
        title: "Cobertura en riesgo",
        summary: "El modelo ARIMA pierde precisión desde el día 45 y requiere reentrenamiento.",
        recommendation: "Programa nueva corrida con features de tipo evento y activa alerta preventiva.",
      },
    ],
    []
  )

  const actions = useMemo<AnalyticsQuickAction[]>(
    () => [
      {
        id: "configure-alerts",
        label: "Configurar alertas",
        href: "/alerts",
        description: "Recibe avisos si el error excede el umbral definido por segmento.",
      },
      {
        id: "sync-recommendations",
        label: "Ir a recomendaciones",
        href: "/analytics/recommendations",
        description: "Propaga ajustes presupuestarios según el pronóstico base.",
      },
      {
        id: "share-narrative",
        label: "Compartir narrativa ejecutiva",
        href: "/analytics/insights",
        description: "Envía el resumen del forecast al equipo directivo y registra decisiones.",
      },
    ],
    []
  )

  return {
    series,
    models,
    schedules,
    insights,
    actions,
  }
}
