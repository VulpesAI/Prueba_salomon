export type GoalPace = "ahead" | "on_track" | "off_track" | "completed"

export type GoalMetrics = {
  totalActual: number
  expectedAmountByNow: number
  deviationAmount: number
  deviationRatio: number
  progressPercentage: number
  pace: GoalPace
  eta: string | null
  lastRecordedAt: string | null
}

export type GoalProgress = {
  id: string
  actualAmount: number
  expectedAmount: number | null
  note?: string
  recordedAt: string
}

export type GoalStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED"

export type FinancialGoal = {
  id: string
  name: string
  description?: string
  category?: string
  status: GoalStatus
  targetAmount: number
  initialAmount: number
  expectedMonthlyContribution: number | null
  deviationThreshold: number
  startDate: string
  targetDate: string
  metrics: GoalMetrics
  progressHistory: GoalProgress[]
}

export type GoalsSummary = {
  total: number
  active: number
  completed: number
  onTrack: number
  offTrack: number
  ahead: number
}

export type GoalsApiResponse = {
  goals: FinancialGoal[]
  summary: GoalsSummary
}
