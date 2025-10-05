import { CATEGORY_COLOR_MAP } from "@/config/category-colors"
import { api } from "@/lib/api-client"
import type {
  DashboardIntelligenceResponse,
  DashboardNotificationsResponse,
  DashboardOverviewResponse,
  RecommendationFeedbackPayload,
  UserNotificationPreferences,
} from "@/types/dashboard"

type RequestOptions = {
  signal?: AbortSignal
}

const logFallbackWarning = (message: string, error: unknown) => {
  if (process.env.NODE_ENV !== "production") {
    console.warn(message, error)
  }
}

export const getDashboardOverview = async ({ signal }: RequestOptions = {}) => {
  try {
    const response = await api.get<DashboardOverviewResponse>(
      "/api/v1/dashboard/overview",
      { signal }
    )

    return response.data
  } catch (error) {
    logFallbackWarning("Falling back to mock dashboard overview data", error)

    return {
      totals: {
        balance: 12_850,
        income: 8_650,
        expenses: 5_230,
        savings: 2_740,
      },
      accounts: [
        {
          id: "acc_1",
          name: "Cuenta corriente",
          balance: 4_250,
          type: "checking",
          institution: "Banco Central",
          currency: "CLP",
        },
        {
          id: "acc_2",
          name: "Tarjeta premium",
          balance: -850,
          type: "credit",
          institution: "Banco Central",
          currency: "CLP",
        },
        {
          id: "acc_3",
          name: "Ahorros",
          balance: 8_900,
          type: "savings",
          institution: "Finanzas Digitales",
          currency: "CLP",
        },
      ],
      recentTransactions: [
        {
          id: "txn_1",
          description: "Pago de nómina",
          amount: 2_800,
          date: new Date().toISOString(),
          category: "Ingresos",
        },
        {
          id: "txn_2",
          description: "Supermercado",
          amount: -650,
          date: new Date().toISOString(),
          category: "Gastos esenciales",
        },
        {
          id: "txn_3",
          description: "Servicio de streaming",
          amount: -200,
          date: new Date().toISOString(),
          category: "Suscripciones",
        },
      ],
      categoryBreakdown: [
        {
          name: "Vivienda",
          amount: 1_800,
          percentage: 34,
          themeKey: "vivienda",
          color: CATEGORY_COLOR_MAP.vivienda,
        },
        {
          name: "Transporte",
          amount: 620,
          percentage: 12,
          themeKey: "transporte",
          color: CATEGORY_COLOR_MAP.transporte,
        },
        {
          name: "Estilo de vida",
          amount: 420,
          percentage: 8,
          themeKey: "entretenimiento",
          color: CATEGORY_COLOR_MAP.entretenimiento,
        },
        {
          name: "Ahorro",
          amount: 1_200,
          percentage: 23,
          themeKey: "ahorro",
          color: CATEGORY_COLOR_MAP.ahorro,
        },
      ],
    }
  }
}

export const getDashboardIntelligence = async ({ signal }: RequestOptions = {}) => {
  try {
    const response = await api.get<DashboardIntelligenceResponse>(
      "/api/v1/dashboard/intelligence",
      { signal }
    )

    return response.data
  } catch (error) {
    logFallbackWarning("Falling back to mock dashboard intelligence data", error)

    const fallbackResponse: DashboardIntelligenceResponse = {
      forecastSummary: {
        modelType: "prophet_v1",
        generatedAt: new Date().toISOString(),
        horizonDays: 30,
        historyDays: 180,
        trend: {
          direction: "upward",
          change: 1_250,
          changePercentage: 0.12,
        },
        forecasts: Array.from({ length: 6 }).map((_, index) => ({
          date: new Date(Date.now() + index * 5 * 86_400_000).toISOString(),
          amount: 4_800 + index * 180,
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
    }

    return fallbackResponse
  }
}

export const getDashboardNotifications = async ({
  signal,
}: RequestOptions = {}) => {
  try {
    const response = await api.get<DashboardNotificationsResponse>(
      "/api/v1/dashboard/notifications",
      { signal }
    )

    return response.data
  } catch (error) {
    logFallbackWarning("Falling back to mock dashboard notifications", error)

    const fallbackResponse: DashboardNotificationsResponse = {
      notifications: [
        {
          id: "notif_1",
          message: "Conectamos correctamente tu cuenta principal.",
          read: false,
          channel: "in_app",
          severity: "info",
          createdAt: new Date().toISOString(),
        },
        {
          id: "notif_2",
          message: "Detectamos un gasto inusual en entretenimiento.",
          read: false,
          channel: "push",
          severity: "warning",
          createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
          metadata: { amount: 950 },
        },
        {
          id: "notif_3",
          message: "Tu meta de ahorro mensual está por alcanzarse.",
          read: true,
          channel: "email",
          severity: "info",
          createdAt: new Date(Date.now() - 7 * 86_400_000).toISOString(),
        },
      ],
      preferences: {
        email: true,
        push: true,
        sms: false,
        mutedEvents: [{ key: "marketing", until: null }],
      },
    }

    return fallbackResponse
  }
}

export const updateNotificationPreferences = async (
  preferences: UserNotificationPreferences
) => {
  try {
    await api.put("/api/v1/dashboard/notifications/preferences", preferences)
  } catch (error) {
    logFallbackWarning("Failed to persist notification preferences", error)
  }

  return preferences
}

export const sendDashboardRecommendationFeedback = async (
  payload: RecommendationFeedbackPayload
) => {
  await api.post("/api/v1/dashboard/recommendations/feedback", payload)
}
