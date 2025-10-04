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
  "Arriendo",
  "Supermercado",
  "Transporte",
  "Servicios del hogar",
  "Entretenimiento",
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
      Arriendo: [80, 80, 80, 82, 82, 82],
      Supermercado: [52, 48, 55, 58, 54, 56],
      Transporte: [24, 26, 22, 25, 27, 23],
      "Servicios del hogar": [30, 32, 29, 28, 31, 34],
      Entretenimiento: [18, 22, 20, 24, 26, 21],
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
      { category: "Arriendo", total: 420000, share: 0.36, change: 0.01, status: "up" },
      { category: "Supermercado", total: 305000, share: 0.26, change: 0.08, status: "up" },
      { category: "Transporte", total: 128000, share: 0.11, change: -0.05, status: "down" },
      {
        category: "Servicios del hogar",
        total: 152000,
        share: 0.13,
        change: 0.04,
        status: "up",
      },
      { category: "Entretenimiento", total: 165000, share: 0.14, change: 0.06, status: "up" },
    ],
    []
  )

  const drilldowns = useMemo<CategoryDrilldownItem[]>(
    () => [
      {
        subcategory: "Arriendo mensual",
        parent: "Arriendo",
        transactions: 6,
        averageTicket: 420000,
        change: 0,
      },
      {
        subcategory: "Compras de la semana",
        parent: "Supermercado",
        transactions: 18,
        averageTicket: 18500,
        change: 0.14,
      },
      {
        subcategory: "Aplicaciones de transporte",
        parent: "Transporte",
        transactions: 22,
        averageTicket: 5600,
        change: -0.08,
      },
      {
        subcategory: "Luz y agua",
        parent: "Servicios del hogar",
        transactions: 8,
        averageTicket: 21500,
        change: 0.06,
      },
      {
        subcategory: "Salidas de fin de semana",
        parent: "Entretenimiento",
        transactions: 5,
        averageTicket: 32000,
        change: 0.11,
      },
    ],
    []
  )

  const adjustments = useMemo<CategoryAdjustment[]>(
    () => [
      {
        id: "renegotiate-rent",
        title: "Revisar condiciones de arriendo",
        description:
          "Pregunta por un descuento por pago anticipado o acuerdos de permanencia de más meses. Una rebaja del 5% libera espacio para tus metas.",
        impact: "Ahorro potencial: $21.000 / mes",
        href: "/analytics/recommendations",
        actionLabel: "Ver consejos",
      },
      {
        id: "plan-supermarket",
        title: "Planificar compras del supermercado",
        description:
          "Haz una lista semanal y aprovecha ofertas en productos básicos. Reduciendo las compras impulsivas podrías bajar un 8% el gasto.",
        impact: "Objetivo: -$24.000 / mes",
        href: "/alerts",
        actionLabel: "Crear recordatorio",
      },
      {
        id: "adjust-subscriptions",
        title: "Ordenar suscripciones y servicios",
        description:
          "Revisa qué apps de streaming o servicios hogareños no estás usando. Cancelar dos de ellos libera presupuesto para el ahorro de emergencia.",
        impact: "Impacto estimado: +$15.500",
        href: "/goals",
        actionLabel: "Asignar ahorro",
      },
    ],
    []
  )

  const actions = useMemo<AnalyticsQuickAction[]>(
    () => [
      {
        id: "link-recommendations",
        label: "Ver recomendaciones personalizadas",
        href: "/analytics/recommendations",
        description: "Recibe sugerencias para equilibrar tu presupuesto del mes.",
      },
      {
        id: "configure-alerts",
        label: "Configurar alertas",
        href: "/alerts",
        description: "Activa avisos cuando una categoría se acerque a tu límite.",
      },
      {
        id: "design-budget",
        label: "Ajustar tus metas y presupuesto",
        href: "/goals",
        description: "Redistribuye montos y vincúlalos a tus metas personales.",
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
