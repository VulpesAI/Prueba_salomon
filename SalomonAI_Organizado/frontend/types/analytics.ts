export type CategoryHeatmapPoint = {
  category: string
  month: string
  value: number
}

export type CategoryAggregate = {
  category: string
  total: number
  share: number
  change: number
  status: "up" | "down"
}

export type CategoryDrilldownItem = {
  subcategory: string
  parent: string
  transactions: number
  averageTicket: number
  change: number
}

import type { Route } from "next"

export type CategoryAdjustment = {
  id: string
  title: string
  description: string
  impact: string
  href: Route
  actionLabel: string
}

export type ForecastSeriesPoint = {
  date: string
  actual?: number | null
  forecast: number
  upper: number
  lower: number
}

export type ForecastModelSummary = {
  model: string
  horizon: string
  mape: number
  coverage: number
  status: "Activo" | "Entrenando" | "Revisar"
}

export type ForecastSchedule = {
  id: string
  name: string
  cadence: string
  nextRun: string
  channel: string
}

export type ForecastInsight = {
  id: string
  title: string
  summary: string
  recommendation: string
}

export type InsightNarrative = {
  id: string
  title: string
  summary: string
  highlight: string
  href: Route
}

export type InsightComparison = {
  cohort: string
  retention: number
  growth: number
  clv: number
}

export type InsightExecutiveMetric = {
  title: string
  value: string
  delta: string
  tone: "positive" | "negative" | "neutral"
}

export type InsightAction = {
  id: string
  label: string
  description: string
  href: Route
}

export type RecommendationCampaign = {
  id: string
  name: string
  audience: string
  uplift: number
  conversion: number
  status: "Activa" | "Pausada"
}

export type RecommendationExperiment = {
  id: string
  name: string
  hypothesis: string
  metric: string
  lift: number
  status: "En curso" | "Completado" | "Planificado"
}

export type RecommendationFeedback = {
  id: string
  source: string
  sentiment: "Positivo" | "Neutral" | "Negativo"
  volume: number
  lastUpdate: string
  excerpt: string
}

export type AnalyticsQuickAction = {
  id: string
  label: string
  href: Route
  description: string
}
