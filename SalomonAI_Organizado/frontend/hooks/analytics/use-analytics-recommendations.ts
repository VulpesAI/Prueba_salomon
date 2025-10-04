"use client"

import { useMemo } from "react"

import type {
  AnalyticsQuickAction,
  RecommendationCampaign,
  RecommendationExperiment,
  RecommendationFeedback,
} from "@/types/analytics"

type UseAnalyticsRecommendationsResult = {
  campaigns: RecommendationCampaign[]
  experiments: RecommendationExperiment[]
  feedback: RecommendationFeedback[]
  quickActions: AnalyticsQuickAction[]
}

export const useAnalyticsRecommendations = (): UseAnalyticsRecommendationsResult => {
  const campaigns = useMemo<RecommendationCampaign[]>(
    () => [
      {
        id: "smart-saving",
        name: "Ahorro inteligente",
        audience: "Clientes con liquidez alta",
        uplift: 0.18,
        conversion: 0.32,
        status: "Activa",
      },
      {
        id: "card-upgrade",
        name: "Upgrade tarjeta",
        audience: "Usuarios pagos recurrentes",
        uplift: 0.11,
        conversion: 0.26,
        status: "Activa",
      },
      {
        id: "expense-alert",
        name: "Alertas de gasto",
        audience: "Segmento empresas",
        uplift: 0.07,
        conversion: 0.21,
        status: "Pausada",
      },
    ],
    []
  )

  const experiments = useMemo<RecommendationExperiment[]>(
    () => [
      {
        id: "exp-forecast-call",
        name: "Script asesoría predictiva",
        hypothesis: "Un guion personalizado incrementa tasa de contratación de planes pro.",
        metric: "Conversiones plan pro",
        lift: 0.09,
        status: "En curso",
      },
      {
        id: "exp-savings-nudge",
        name: "Empujón meta ahorro",
        hypothesis: "Recordatorios dinámicos elevan el aporte promedio mensual.",
        metric: "Monto de aporte",
        lift: 0.05,
        status: "Completado",
      },
      {
        id: "exp-alerts-ui",
        name: "Nuevas tarjetas de alerta",
        hypothesis: "Visuales compactos mejoran el reconocimiento de alertas críticas.",
        metric: "CTR alertas",
        lift: 0.12,
        status: "Planificado",
      },
    ],
    []
  )

  const feedback = useMemo<RecommendationFeedback[]>(
    () => [
      {
        id: "fdbk-inapp",
        source: "Feedback in-app",
        sentiment: "Positivo",
        volume: 128,
        lastUpdate: "Hace 2 días",
        excerpt: "La recomendación de ahorro automático fue clara y fácil de activar.",
      },
      {
        id: "fdbk-support",
        source: "Casos de soporte",
        sentiment: "Neutral",
        volume: 42,
        lastUpdate: "Hace 5 días",
        excerpt: "Clientes empresariales solicitan configurar umbrales de alerta más específicos.",
      },
      {
        id: "fdbk-survey",
        source: "Encuesta NPS",
        sentiment: "Negativo",
        volume: 18,
        lastUpdate: "Hace 1 semana",
        excerpt: "Algunos usuarios no reconocen el beneficio de las campañas pausadas.",
      },
    ],
    []
  )

  const quickActions = useMemo<AnalyticsQuickAction[]>(
    () => [
      {
        id: "open-analytics",
        label: "Ver mapa de calor",
        href: "/analytics/categories",
        description: "Cruza resultados de campañas con categorías críticas.",
      },
      {
        id: "sync-forecasts",
        label: "Sincronizar con pronósticos",
        href: "/analytics/forecasts",
        description: "Alinea presupuestos de campañas con escenarios proyectados.",
      },
      {
        id: "configure-alerts",
        label: "Configurar alertas",
        href: "/alerts",
        description: "Recibe avisos cuando una campaña pierda uplift esperado.",
      },
    ],
    []
  )

  return {
    campaigns,
    experiments,
    feedback,
    quickActions,
  }
}
