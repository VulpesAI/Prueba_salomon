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
  const narratives = useMemo<InsightNarrative[]>(
    () => [
      {
        id: "cash-story",
        title: "Narrativa de caja saludable",
        summary:
          "El flujo operativo financia 82% del plan de inversión y permite reducir líneas de crédito en Q3.",
        highlight: "Margen operativo +2.4 pp vs. trimestre anterior",
        href: "/analytics/forecasts",
      },
      {
        id: "retail-cohort",
        title: "Cohorte retail resiliente",
        summary:
          "Clientes adquiridos en campañas navideñas sostienen ticket promedio 15% superior al resto tras 5 meses.",
        highlight: "Tasa de retención 74%",
        href: "/analytics/recommendations",
      },
      {
        id: "cost-optimization",
        title: "Palancas de eficiencia",
        summary:
          "Dos iniciativas en logística inteligente y renegociación cloud liberan $6.6M mensuales.",
        highlight: "Break-even adelantado 6 semanas",
        href: "/alerts",
      },
    ],
    []
  )

  const comparisons = useMemo<InsightComparison[]>(
    () => [
      { cohort: "Cohorte Q1", retention: 0.68, growth: 0.11, clv: 540000 },
      { cohort: "Cohorte Q2", retention: 0.74, growth: 0.15, clv: 610000 },
      { cohort: "Cohorte Q3", retention: 0.63, growth: 0.09, clv: 498000 },
      { cohort: "Cohorte Premium", retention: 0.81, growth: 0.18, clv: 720000 },
    ],
    []
  )

  const executiveMetrics = useMemo<InsightExecutiveMetric[]>(
    () => [
      { title: "Ingresos recurrentes", value: "$54.2M", delta: "+6.3% MoM", tone: "positive" },
      { title: "Eficiencia operativa", value: "82%", delta: "+2.1 pp", tone: "positive" },
      { title: "Runway", value: "14 meses", delta: "+1 mes", tone: "neutral" },
      { title: "Alertas críticas", value: "2 abiertas", delta: "-1 vs. semana pasada", tone: "positive" },
    ],
    []
  )

  const actions = useMemo<InsightAction[]>(
    () => [
      {
        id: "share-board",
        label: "Preparar resumen para directorio",
        description: "Genera PDF con narrativa y anexos de cohortes en un clic.",
        href: "/assistant",
      },
      {
        id: "sync-campaign",
        label: "Sincronizar campaña derivada",
        description: "Activa recomendaciones focalizadas en cohorte premium.",
        href: "/analytics/recommendations",
      },
      {
        id: "track-decisions",
        label: "Registrar decisiones",
        description: "Documenta acuerdos y responsables asociados a este insight.",
        href: "/notifications",
      },
    ],
    []
  )

  const quickActions = useMemo<AnalyticsQuickAction[]>(
    () => [
      {
        id: "open-forecasts",
        label: "Ver pronósticos",
        href: "/analytics/forecasts",
        description: "Contrasta narrativas con escenarios cuantitativos.",
      },
      {
        id: "configure-alerts",
        label: "Configurar alertas",
        href: "/alerts",
        description: "Sigue los KPI críticos mencionados en el resumen ejecutivo.",
      },
      {
        id: "launch-experiment",
        label: "Diseñar nuevo experimento",
        href: "/analytics/recommendations",
        description: "Evalúa impacto de la narrativa en campañas automatizadas.",
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
