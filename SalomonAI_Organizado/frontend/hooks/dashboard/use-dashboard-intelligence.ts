"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

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

type IntelligenceState = {
  forecastSummary: ForecastSummary | null
  predictiveAlerts: PredictiveAlert[]
  insights: DashboardInsight[]
  recommendations: PersonalizedRecommendation[]
  recommendationFeedback: Record<string, FeedbackStatus>
  isLoading: boolean
  error: string | null
}

const initialState: IntelligenceState = {
  forecastSummary: null,
  predictiveAlerts: [],
  insights: [],
  recommendations: [],
  recommendationFeedback: {},
  isLoading: true,
  error: null,
}

export const useDashboardIntelligence = () => {
  const { user } = useAuth()
  const [state, setState] = useState<IntelligenceState>(initialState)

  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000",
    []
  )

  const fetchIntelligence = useCallback(async () => {
    if (!user) {
      setState((previous) => ({ ...previous, isLoading: false, error: null }))
      return
    }

    setState((previous) => ({ ...previous, isLoading: true, error: null }))

    try {
      const token = await user.getIdToken()
      const authHeaders = { Authorization: `Bearer ${token}` }

      // TODO: Reemplazar por integración real con el backend
      // const insightsResponse = await fetch(`${apiBaseUrl}/api/v1/dashboard/insights`, {
      //   headers: authHeaders,
      // })
      // const forecastsResponse = await fetch(`${apiBaseUrl}/api/v1/dashboard/forecasts`, {
      //   headers: authHeaders,
      // })
      // const recommendationsResponse = await fetch(`${apiBaseUrl}/api/v1/dashboard/recommendations/personalized`, {
      //   headers: authHeaders,
      // })
      // const [insightsData, forecastsData, recommendationsData] = await Promise.all([
      //   insightsResponse.json(),
      //   forecastsResponse.json(),
      //   recommendationsResponse.json(),
      // ])

      void authHeaders

      setState({
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
            title: "Aumenta tu fondo de emergencias",
            description:
              "Puedes destinar 10% del superávit proyectado para alcanzar 4 meses de colchón.",
            score: 0.76,
            category: "Planeación",
            explanation: "Balance positivo constante en los últimos 6 meses.",
          },
        ],
        recommendationFeedback: {},
        isLoading: false,
        error: null,
      })
    } catch (error) {
      console.error("Dashboard intelligence placeholder error", error)
      setState((previous) => ({
        ...previous,
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "No pudimos cargar los datos analíticos.",
      }))
    }
  }, [apiBaseUrl, user])

  const sendRecommendationFeedback = useCallback(
    async (recommendationId: string, feedback: "positive" | "negative") => {
      if (!user) return

      setState((previous) => ({
        ...previous,
        recommendationFeedback: {
          ...previous.recommendationFeedback,
          [recommendationId]: "sending",
        },
      }))

      try {
        const token = await user.getIdToken()
        const authHeaders = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        }

        // TODO: Integrar con el endpoint real de feedback
        // await fetch(`${apiBaseUrl}/api/v1/dashboard/recommendations/feedback`, {
        //   method: "POST",
        //   headers: authHeaders,
        //   body: JSON.stringify({ id: recommendationId, feedback }),
        // })

        void authHeaders

        setState((previous) => ({
          ...previous,
          recommendationFeedback: {
            ...previous.recommendationFeedback,
            [recommendationId]: "sent",
          },
        }))
      } catch (error) {
        console.error("Dashboard feedback placeholder error", error)
        setState((previous) => ({
          ...previous,
          recommendationFeedback: {
            ...previous.recommendationFeedback,
            [recommendationId]: "error",
          },
        }))
      }
    },
    [apiBaseUrl, user]
  )

  useEffect(() => {
    void fetchIntelligence()
  }, [fetchIntelligence])

  return {
    ...state,
    refresh: fetchIntelligence,
    sendRecommendationFeedback,
    apiBaseUrl,
  }
}
