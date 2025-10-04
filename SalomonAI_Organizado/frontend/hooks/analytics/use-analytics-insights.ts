"use client"

import { useMemo } from "react"

import type {
  AnalyticsQuickAction,
  InsightAction,
  InsightComparison,
  InsightExecutiveMetric,
  InsightNarrative,
} from "@/types/analytics"

type UseAnalyticsInsightsResult = {
  narratives: InsightNarrative[]
  comparisons: InsightComparison[]
  executiveMetrics: InsightExecutiveMetric[]
  actions: InsightAction[]
  quickActions: AnalyticsQuickAction[]
}

export const useAnalyticsInsights = (): UseAnalyticsInsightsResult => {
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0,
      }),
    []
  )

  const narratives = useMemo<InsightNarrative[]>(
    () => [
      {
        id: "restaurant-trend",
        title: "Tus gastos en restaurantes subieron 28%",
        summary: `En el último mes destinaste ${currencyFormatter.format(
          185000,
        )} a restaurantes, ${currencyFormatter.format(
          41000,
        )} más que tu promedio de los últimos tres meses.`,
        highlight: "+28% vs. promedio trimestral",
        href: "/analytics/categories",
      },
      {
        id: "savings-goal",
        title: "Llevas 65% de tu meta de ahorro semestral",
        summary: `A la fecha acumulaste ${currencyFormatter.format(
          520000,
        )} en tu meta "Viaje", por lo que necesitas ${currencyFormatter.format(
          280000,
        )} adicionales para cumplirla en junio.`,
        highlight: "Meta en curso",
        href: "/analytics/forecasts",
      },
      {
        id: "duplicate-subs",
        title: "Suscripciones duplicadas detectadas",
        summary: `Pagaste dos veces ${currencyFormatter.format(
          10990,
        )} por servicios de streaming este mes. Cancela una suscripción para liberar presupuesto.`,
        highlight: `${currencyFormatter.format(10990)} potencial de ahorro`,
        href: "/alerts",
      },
    ],
    [currencyFormatter]
  )

  const comparisons = useMemo<InsightComparison[]>(
    () => [
      { cohort: "Restaurantes", retention: 0.28, growth: -0.05, clv: 185000 },
      { cohort: "Supermercado", retention: -0.12, growth: 0.07, clv: 142000 },
      { cohort: "Transporte", retention: 0.04, growth: 0.12, clv: 68000 },
      { cohort: "Suscripciones", retention: 0.19, growth: -0.02, clv: 45980 },
    ],
    []
  )

  const executiveMetrics = useMemo<InsightExecutiveMetric[]>(
    () => [
      {
        title: "Disponible para ahorrar este mes",
        value: currencyFormatter.format(320000),
        delta: `${currencyFormatter.format(45000)} vs. mes anterior`,
        tone: "positive",
      },
      {
        title: "Gasto fijo comprometido",
        value: currencyFormatter.format(410000),
        delta: `${currencyFormatter.format(12000)} adicional`,
        tone: "negative",
      },
      {
        title: "Tasa de ahorro",
        value: "18% de tus ingresos",
        delta: "+3 pp vs. objetivo",
        tone: "positive",
      },
      {
        title: "Pagos próximos a vencer",
        value: "2 por confirmar",
        delta: "Revisa en los próximos 3 días",
        tone: "neutral",
      },
    ],
    [currencyFormatter]
  )

  const actions = useMemo<InsightAction[]>(
    () => [
      {
        id: "review-restaurants",
        label: "Analizar gasto en restaurantes",
        description: "Revisa transacciones recientes y define un límite semanal.",
        href: "/analytics/categories",
      },
      {
        id: "schedule-transfer",
        label: "Automatizar transferencia a tu meta",
        description: "Agenda un traspaso mensual para asegurar el ahorro pendiente.",
        href: "/assistant",
      },
      {
        id: "cancel-duplicate",
        label: "Cancelar suscripción duplicada",
        description: "Verifica cargos repetidos y cierra el servicio innecesario.",
        href: "/notifications",
      },
    ],
    []
  )

  const quickActions = useMemo<AnalyticsQuickAction[]>(
    () => [
      {
        id: "set-budget",
        label: "Ajustar presupuesto mensual",
        href: "/alerts",
        description: "Define alertas cuando un gasto exceda lo planificado.",
      },
      {
        id: "explore-savings",
        label: "Simular meta de ahorro",
        href: "/analytics/forecasts",
        description: "Proyecta cuánto acumularás si mantienes tu ritmo actual.",
      },
      {
        id: "review-subscriptions",
        label: "Gestionar suscripciones",
        href: "/analytics/recommendations",
        description: "Identifica servicios que puedes pausar o renegociar.",
      },
    ],
    []
  )

  return {
    narratives,
    comparisons,
    executiveMetrics,
    actions,
    quickActions,
  }
}
