import { api } from "@/lib/api-client"
import type {
  DashboardIntelligenceResponse,
  DashboardNotificationsResponse,
  DashboardOverviewResponse,
  DashboardSummaryResponse,
  NotificationDigestSettings,
  NotificationSettingsResponse,
  NotificationTemplateSettings,
  RecommendationFeedbackPayload,
  UserNotificationPreferences,
} from "@/types/dashboard"

type RequestOptions = {
  signal?: AbortSignal
}

const logApiWarning = (message: string, error: unknown) => {
  if (process.env.NODE_ENV !== "production") {
    console.warn(message, error)
  }
}

const toApiError = (error: unknown, fallbackMessage: string) => {
  logApiWarning(fallbackMessage, error)
  if (error instanceof Error && error.message) {
    return error
  }

  const normalized = new Error(fallbackMessage)
  if (error instanceof Error) {
    normalized.name = error.name || normalized.name
  }
  return normalized
}

export const getDashboardOverview = async ({ signal }: RequestOptions = {}) => {
  try {
    const response = await api.get<DashboardOverviewResponse>(
      "/api/v1/dashboard/overview",
      { signal }
    )

    return response.data
  } catch (error) {
    throw toApiError(error, "No pudimos cargar el resumen financiero.")
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
    throw toApiError(error, "No pudimos cargar la inteligencia financiera.")
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
    throw toApiError(error, "No pudimos obtener tus notificaciones.")
  }
}

export const updateNotificationPreferences = async (
  preferences: UserNotificationPreferences
) => {
  const response = await api.put<UserNotificationPreferences>(
    "/api/v1/dashboard/notifications/preferences",
    preferences
  )

  return response.data ?? preferences
}

export const sendDashboardRecommendationFeedback = async (
  payload: RecommendationFeedbackPayload
) => {
  await api.post("/api/v1/dashboard/recommendations/feedback", payload)
}

export const getDashboardSummary = async (
  params: {
    userId: string
    accountId?: string
    startDate?: string
    endDate?: string
    granularity?: "day" | "week" | "month"
    maxCategories?: number
    currency?: string
  },
  { signal }: RequestOptions = {}
) => {
  const response = await api.get<DashboardSummaryResponse>(
    "/api/v1/dashboard/summary",
    {
      params,
      signal,
    }
  )

  return response.data
}

export const getNotificationSettings = async ({
  signal,
}: RequestOptions = {}) => {
  const response = await api.get<NotificationSettingsResponse>(
    "/api/v1/dashboard/notifications/settings",
    { signal }
  )

  return response.data
}

export const updateNotificationDigest = async (
  digest: NotificationDigestSettings
) => {
  const response = await api.put<NotificationDigestSettings>(
    "/api/v1/dashboard/notifications/digest",
    digest
  )

  return response.data ?? digest
}

export const updateNotificationChannels = async (
  channels: Required<Pick<UserNotificationPreferences, "email" | "push" | "sms" | "inApp">>
) => {
  const response = await api.put<Required<
    Pick<UserNotificationPreferences, "email" | "push" | "sms" | "inApp">
  >>("/api/v1/dashboard/notifications/channels", channels)

  return response.data ?? channels
}

export const updateNotificationTemplates = async (
  templates: Array<{ id: string; subject: string }>
) => {
  const response = await api.put<NotificationTemplateSettings[]>(
    "/api/v1/dashboard/notifications/templates",
    { templates }
  )

  if (response.data) {
    return response.data
  }

  return templates.map((template) => ({
    id: template.id,
    subject: template.subject,
    name: template.id,
    defaultSubject: template.subject,
  }))
}
