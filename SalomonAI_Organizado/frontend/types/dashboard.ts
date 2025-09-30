export type OverviewTotals = {
  balance: number
  income: number
  expenses: number
  savings?: number | null
}

export type AccountSummary = {
  id: string
  name: string
  balance: number
  type?: string | null
  institution?: string | null
  currency?: string | null
}

export type TransactionSummary = {
  id: string
  description: string
  amount: number
  date: string
  category?: string | null
  currency?: string | null
}

export type CategoryBreakdown = {
  name: string
  amount: number
  percentage: number
  color: string
}

export type DashboardOverviewResponse = {
  totals: OverviewTotals
  accounts: AccountSummary[]
  recentTransactions: TransactionSummary[]
  categoryBreakdown: CategoryBreakdown[]
}

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

export type DashboardIntelligenceResponse = {
  forecastSummary: ForecastSummary | null
  predictiveAlerts: PredictiveAlert[]
  insights: DashboardInsight[]
  recommendations: PersonalizedRecommendation[]
}

export type FeedbackStatus = "idle" | "sending" | "sent" | "error"

export type NotificationChannel = "email" | "push" | "sms" | "in_app"
export type NotificationSeverity = "info" | "warning" | "critical"

export type NotificationHistoryItem = {
  id: string
  message: string
  read: boolean
  channel: NotificationChannel
  severity: NotificationSeverity
  createdAt: string
  metadata?: Record<string, unknown> | null
}

export type UserNotificationPreferences = {
  email?: boolean
  push?: boolean
  sms?: boolean
  mutedEvents?: { key: string; until?: string | null }[]
}

export type DashboardNotificationsResponse = {
  notifications: NotificationHistoryItem[]
  preferences: UserNotificationPreferences | null
}

export type RecommendationFeedbackPayload = {
  recommendationId: string
  feedback: "positive" | "negative"
}
