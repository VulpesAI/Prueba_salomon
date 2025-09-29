"use client"

import { useCallback, useMemo, useState } from "react"

import { useQuery, useQueryClient } from "@tanstack/react-query"

import { useAuth } from "@/context/AuthContext"

export type ForecastDirection = "upward" | "downward" | "stable"

export type ForecastPoint = {
  date: string
  amount: number
}

export type ForecastSummary = {
  modelType: string
  generatedAt: string | null
  horizonDays: number
  historyDays: number
  forecasts: ForecastPoint[]
  trend: {
    direction: ForecastDirection
    change: number
    changePercentage: number
  }
}

export type PredictiveAlert = {
  id: string
  type: "cashflow" | "spending" | "savings"
  severity: "low" | "medium" | "high"
  message: string
  forecastDate: string
  details?: Record<string, unknown>
}

export type InsightMetric = {
  label: string
  value: string | number
  trend?: "up" | "down" | "neutral"
  helperText?: string | null
}

export type DashboardInsight = {
  id: string
  title: string
  description: string
  highlight?: string | null
  metrics?: InsightMetric[]
}

export type PersonalizedRecommendation = {
  id: string
  title: string
  description: string
  score: number
  category: string
  explanation: string
}

type FeedbackStatus = "idle" | "sending" | "sent" | "error"

type IntelligenceResponse = {
  forecastSummary: ForecastSummary | null
  predictiveAlerts: PredictiveAlert[]
  insights: DashboardInsight[]
  recommendations: PersonalizedRecommendation[]
}

type FeedbackState = Record<string, FeedbackStatus>

const QUERY_KEY = ["dashboard", "intelligence"]

const fallbackData: IntelligenceResponse = {
  forecastSummary: null,
  predictiveAlerts: [],
  insights: [],
  recommendations: [],
}

export const useDashboardIntelligence = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [recommendationFeedback, setRecommendationFeedback] = useState<FeedbackState>({})

  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000",
    []
  )

  const query = useQuery<IntelligenceResponse>({
    queryKey: QUERY_KEY,
    enabled: Boolean(user),
    placeholderData: fallbackData,
    queryFn: async () => {
      if (!user) {
        return fallbackData
      }

      const token = await user.getIdToken()
      const authHeaders = { Authorization: `Bearer ${token}` }

      // TODO: Integrar con backend real
      void authHeaders

      return {
        forecastSummary: {
          modelType: "prophet_v1",
          generatedAt: new Date().toISOString(),
          horizonDays: 30,
          historyDays: 180,
          trend: {
            direction: "upward",
            change: 1250,
            changePercentage: 0.12,
          },
          forecasts: Array.from({ length: 6 }).map((_, index) => ({
            date: new Date(Date.now() + index * 5 * 86_400_000).toISOString(),
            amount: 4800 + index * 180,
          })),
        },
        predictiveAlerts: [
          {
            id: "alert_1",
            type: "cashflow",
            severity: "medium",
            message: "Tu flujo de caja podría ser negativo en dos semanas.",
            forecastDate: new Date(Date.now() + 14 * 86_400_000).toISOString(),
            details: {
              driver: "Gasto recurrente alto",
            },
          },
          {
            id: "alert_2",
            type: "savings",
            severity: "low",
            message: "Puedes incrementar tus aportes a la meta de ahorro mensual.",
            forecastDate: new Date(Date.now() + 21 * 86_400_000).toISOString(),
          },
        ],
        insights: [
          {
            id: "insight_1",
            title: "Categorías con mayor variación",
            description:
              "Los gastos en estilo de vida crecieron 18% respecto al mes anterior.",
            highlight: "Monitorear suscripciones y entretenimiento.",
            metrics: [
              {
                label: "Cambio mensual",
                value: "+18%",
                trend: "up",
                helperText: "Vs. promedio de los últimos 3 meses",
              },
            ],
          },
          {
            id: "insight_2",
            title: "Ingresos recurrentes",
            description: "El 92% de tus ingresos provienen de depósitos fijos.",
            metrics: [
              {
                label: "Ingresos fijos",
                value: "92%",
                trend: "neutral",
              },
              {
                label: "Variación",
                value: "+4%",
                trend: "up",
                helperText: "Respecto al promedio trimestral",
              },
            ],
          },
        ],
        recommendations: [
          {
            id: "rec_1",
            title: "Optimiza tu suscripción premium",
            description:
              "Considera migrar al plan anual para ahorrar 15% frente al pago mensual.",
            score: 0.82,
            category: "Ahorro",
            explanation: "Detección de pagos recurrentes y beneficios activos.",
          },
          {
            id: "rec_2",
            title: "Anticipa pagos de servicios",
            description:
              "Programa recordatorios automáticos para evitar recargos por atraso.",
            score: 0.64,
            category: "Operación",
            explanation: "Historial de pagos y gastos variables.",
          },
        ],
      }
    },
  })

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
    [queryClient]
  )

  const sendRecommendationFeedback = useCallback(
    async (recommendationId: string, feedback: "positive" | "negative") => {
      if (!user) return

      setRecommendationFeedback((previous) => ({
        ...previous,
        [recommendationId]: "sending",
      }))

      try {
        const token = await user.getIdToken()
        const authHeaders = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        }

        // TODO: Integrar con endpoint real
        void authHeaders
        void feedback

        setRecommendationFeedback((previous) => ({
          ...previous,
          [recommendationId]: "sent",
        }))
      } catch (error) {
        console.error("Dashboard recommendation feedback placeholder error", error)
        setRecommendationFeedback((previous) => ({
          ...previous,
          [recommendationId]: "error",
        }))
      }
    },
    [user]
  )

  const data = query.data ?? fallbackData

  return {
    ...data,
    recommendationFeedback,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refresh,
    sendRecommendationFeedback,
    apiBaseUrl,
  }
}
