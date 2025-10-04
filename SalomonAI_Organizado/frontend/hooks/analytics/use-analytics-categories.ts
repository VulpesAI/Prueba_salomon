"use client"

import { useMemo } from "react"

import type {
  AnalyticsQuickAction,
  CategoryAdjustment,
  CategoryAggregate,
  CategoryDrilldownItem,
  CategoryHeatmapPoint,
} from "@/types/analytics"

type CategoryHeatmap = {
  months: string[]
  categories: string[]
  points: CategoryHeatmapPoint[]
  matrix: Record<string, Record<string, number>>
}

type UseAnalyticsCategoriesResult = {
  heatmap: CategoryHeatmap
  aggregates: CategoryAggregate[]
  drilldowns: CategoryDrilldownItem[]
  adjustments: CategoryAdjustment[]
  actions: AnalyticsQuickAction[]
}

const CATEGORY_LABELS = [
  "Operación",
  "Crecimiento",
  "Tecnología",
  "Personas",
  "Finanzas",
]

const MONTH_LABELS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
]

export const useAnalyticsCategories = (): UseAnalyticsCategoriesResult => {
  const heatmap = useMemo<CategoryHeatmap>(() => {
    const baseValues: Record<string, number[]> = {
      Operación: [42, 38, 45, 48, 52, 50],
      Crecimiento: [28, 30, 26, 24, 29, 31],
      Tecnología: [22, 25, 27, 26, 28, 30],
      Personas: [18, 20, 19, 17, 18, 21],
      Finanzas: [15, 17, 16, 18, 19, 20],
    }

    const points: CategoryHeatmapPoint[] = []
    const matrix: Record<string, Record<string, number>> = {}

    CATEGORY_LABELS.forEach((category) => {
      matrix[category] = {}
      baseValues[category].forEach((value, index) => {
        const month = MONTH_LABELS[index]
        matrix[category][month] = value
        points.push({ category, month, value })
      })
    })

    return {
      categories: CATEGORY_LABELS,
      months: MONTH_LABELS,
      points,
      matrix,
    }
  }, [])

  const aggregates = useMemo<CategoryAggregate[]>(
    () => [
      { category: "Operación", total: 52000000, share: 0.38, change: 0.07, status: "up" },
      { category: "Crecimiento", total: 31500000, share: 0.23, change: -0.04, status: "down" },
      { category: "Tecnología", total: 28700000, share: 0.21, change: 0.05, status: "up" },
      { category: "Personas", total: 19800000, share: 0.14, change: 0.02, status: "up" },
      { category: "Finanzas", total: 16400000, share: 0.12, change: -0.03, status: "down" },
    ],
    []
  )

  const drilldowns = useMemo<CategoryDrilldownItem[]>(
    () => [
      {
        subcategory: "Logística inteligente",
        parent: "Operación",
        transactions: 1420,
        averageTicket: 125000,
        change: 0.12,
      },
      {
        subcategory: "Ads performance",
        parent: "Crecimiento",
        transactions: 980,
        averageTicket: 182000,
        change: -0.05,
      },
      {
        subcategory: "Cloud & SaaS",
        parent: "Tecnología",
        transactions: 640,
        averageTicket: 215000,
        change: 0.09,
      },
      {
        subcategory: "Capacitación",
        parent: "Personas",
        transactions: 410,
        averageTicket: 87000,
        change: 0.04,
      },
      {
        subcategory: "Tesorería",
        parent: "Finanzas",
        transactions: 355,
        averageTicket: 158000,
        change: -0.02,
      },
    ],
    []
  )

  const adjustments = useMemo<CategoryAdjustment[]>(
    () => [
      {
        id: "merge-growth",
        title: "Fusionar campañas de adquisición",
        description:
          "Unifica los segmentos de adquisición digital para aprovechar audiencias lookalike y reducir costos por conversión.",
        impact: "Impacto estimado: +$4.5M / mes",
        href: "/analytics/recommendations",
        actionLabel: "Ver recomendaciones",
      },
      {
        id: "optimize-cloud",
        title: "Optimizar licencias cloud",
        description:
          "Ajusta los tiers de almacenamiento y libera instancias subutilizadas. Detectamos un 18% de capacidad ociosa.",
        impact: "Ahorro estimado: $2.1M / mes",
        href: "/alerts",
        actionLabel: "Configurar alerta",
      },
      {
        id: "strengthen-upskilling",
        title: "Refuerzo de upskilling",
        description:
          "Incrementa la inversión en cursos críticos para áreas de analítica y automatización, con ROI positivo al tercer mes.",
        impact: "Retorno proyectado: 3.4x",
        href: "/goals",
        actionLabel: "Asignar presupuesto",
      },
    ],
    []
  )

  const actions = useMemo<AnalyticsQuickAction[]>(
    () => [
      {
        id: "link-recommendations",
        label: "Ir a recomendaciones",
        href: "/analytics/recommendations",
        description: "Despliega ajustes automáticos con base en el mapa de calor.",
      },
      {
        id: "configure-alerts",
        label: "Configurar alertas",
        href: "/alerts",
        description: "Activa monitoreo en tiempo real para desvíos de categoría.",
      },
      {
        id: "design-budget",
        label: "Diseñar escenario presupuestario",
        href: "/goals",
        description: "Simula redistribuciones y compromételas con objetivos financieros.",
      },
    ],
    []
  )

  return {
    heatmap,
    aggregates,
    drilldowns,
    adjustments,
    actions,
  }
}
