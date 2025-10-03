'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/config/query-keys'
import type {
  DashboardIntelligenceResponse,
  DashboardNotificationsResponse,
  DashboardOverviewResponse,
  DashboardInsight,
  ForecastDirection,
  PredictiveAlert,
  PersonalizedRecommendation,
} from '@/types/dashboard'
import type { FinancialSummary } from '@/hooks/useConversationEngine'
import type { GoalsApiResponse, GoalPace } from '@/types/goals'
import type { NormalizedStatement } from '@/lib/statements/parser'

const CATEGORY_COLORS = [
  '#1d4ed8',
  '#22c55e',
  '#f97316',
  '#8b5cf6',
  '#0ea5e9',
  '#facc15',
  '#ef4444',
  '#14b8a6',
]

const MINIMUM_CURRENCY_VALUE = 0

const createId = (prefix: string) =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Math.random().toString(36).slice(2)}`

const clampNumber = (value: number) =>
  Number.isFinite(value) ? Math.round(value) : MINIMUM_CURRENCY_VALUE

const differenceInMonths = (start: Date, end: Date) => {
  const years = end.getFullYear() - start.getFullYear()
  const months = end.getMonth() - start.getMonth()
  const adjustment = end.getDate() >= start.getDate() ? 0 : -1
  return years * 12 + months + adjustment
}

const paceFromDeviation = (deviationRatio: number, progressPercentage: number): GoalPace => {
  if (progressPercentage >= 100) {
    return 'completed'
  }

  if (deviationRatio > 0.05) {
    return 'ahead'
  }

  if (deviationRatio < -0.05) {
    return 'off_track'
  }

  return 'on_track'
}

const buildFinancialSummaryFromStatement = (
  statement: NormalizedStatement
): FinancialSummary => ({
  total_balance: clampNumber(statement.totals.balance),
  monthly_income: clampNumber(statement.totals.income),
  monthly_expenses: clampNumber(statement.totals.expenses),
  expense_breakdown: statement.expenseByCategory,
  recent_transactions: statement.transactions
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 10)
    .map((transaction) => ({
      date: transaction.date,
      description: transaction.description,
      amount: transaction.amount,
      category: transaction.category ?? 'Sin categoría',
    })),
  generated_at: new Date().toISOString(),
})

const buildOverviewFromStatement = (
  statement: NormalizedStatement
): DashboardOverviewResponse => {
  const totals = {
    balance: clampNumber(statement.totals.balance),
    income: clampNumber(statement.totals.income),
    expenses: clampNumber(statement.totals.expenses),
    savings: clampNumber(statement.totals.income - statement.totals.expenses),
  }

  const accounts: DashboardOverviewResponse['accounts'] = [
    {
      id: createId('account'),
      name: 'Cuenta importada',
      balance: totals.balance,
      type: 'checking',
      institution: 'Cartola analizada',
      currency: 'CLP',
    },
  ]

  const recentTransactions = statement.transactions
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 10)
    .map((transaction) => ({
      id: createId('transaction'),
      description: transaction.description,
      amount: transaction.amount,
      date: transaction.date,
      category: transaction.category ?? 'Sin categoría',
      currency: 'CLP',
    }))

  const totalExpenses = statement.totals.expenses || 0

  const categoryBreakdown = Object.entries(statement.expenseByCategory)
    .sort(([, amountA], [, amountB]) => amountB - amountA)
    .map(([name, amount], index) => ({
      name,
      amount: clampNumber(amount),
      percentage:
        totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }))

  return {
    totals,
    accounts,
    recentTransactions,
    categoryBreakdown,
  }
}

const buildIntelligenceFromStatement = (
  statement: NormalizedStatement,
  overview: DashboardOverviewResponse
): DashboardIntelligenceResponse => {
  const netFlow = statement.totals.income - statement.totals.expenses
  const savingsRate = statement.totals.income
    ? (netFlow / statement.totals.income) * 100
    : 0
  const direction: ForecastDirection =
    netFlow > 0 ? 'upward' : netFlow < 0 ? 'downward' : 'stable'

  const weeklyNet = netFlow / 4
  const baseAmount = overview.totals.balance
  const forecasts = Array.from({ length: 6 }).map((_, index) => ({
    date: new Date(Date.now() + (index + 1) * 7 * 86_400_000).toISOString(),
    amount: clampNumber(baseAmount + weeklyNet * (index + 1)),
  }))

  const expenseEntries = Object.entries(statement.expenseByCategory).sort(
    ([, amountA], [, amountB]) => amountB - amountA
  )
  const incomeEntries = Object.entries(statement.incomeByCategory).sort(
    ([, amountA], [, amountB]) => amountB - amountA
  )

  const alerts: PredictiveAlert[] = []

  if (netFlow < 0) {
    alerts.push({
      id: createId('alert'),
      type: 'cashflow',
      severity: Math.abs(netFlow) > overview.totals.balance ? 'high' : 'medium',
      message: 'Tus gastos superan a tus ingresos actuales.',
      forecastDate: forecasts[1]?.date ?? new Date().toISOString(),
      details: {
        deficit: clampNumber(Math.abs(netFlow)),
      },
    })
  } else if (netFlow > 0) {
    alerts.push({
      id: createId('alert'),
      type: 'savings',
      severity: 'low',
      message: 'Tienes capacidad de ahorro disponible este período.',
      forecastDate: forecasts[0]?.date ?? new Date().toISOString(),
      details: {
        surplus: clampNumber(netFlow),
      },
    })
  }

  const topExpense = expenseEntries[0]
  if (topExpense) {
    const [category, amount] = topExpense
    const share = statement.totals.expenses
      ? amount / statement.totals.expenses
      : 0
    alerts.push({
      id: createId('alert'),
      type: 'spending',
      severity: share > 0.35 ? 'high' : share > 0.2 ? 'medium' : 'low',
      message: `La categoría ${category} concentra gran parte de tus gastos recientes.`,
      forecastDate: forecasts[2]?.date ?? new Date().toISOString(),
      details: {
        category,
        amount: clampNumber(amount),
        share: Number.parseFloat((share * 100).toFixed(2)),
      },
    })
  }

  const insights: DashboardInsight[] = []

  insights.push({
    id: createId('insight'),
    title: 'Tasa de ahorro',
    description:
      savingsRate >= 0
        ? `Estás ahorrando el ${savingsRate.toFixed(1)}% de tus ingresos.`
        : `Tienes un déficit del ${Math.abs(savingsRate).toFixed(1)}% respecto de tus ingresos.`,
    highlight:
      savingsRate >= 0
        ? 'Buen punto de partida para tus objetivos de ahorro.'
        : 'Revisa oportunidades para reducir gastos.',
    metrics: [
      {
        label: 'Ingresos',
        value: clampNumber(statement.totals.income).toLocaleString('es-CL'),
        trend: netFlow >= 0 ? 'up' : 'neutral',
      },
      {
        label: 'Gastos',
        value: clampNumber(statement.totals.expenses).toLocaleString('es-CL'),
        trend: netFlow < 0 ? 'up' : 'neutral',
      },
    ],
  })

  if (topExpense) {
    const [category, amount] = topExpense
    insights.push({
      id: createId('insight'),
      title: 'Categoría principal de gasto',
      description: `Tus gastos en ${category} suman ${clampNumber(amount).toLocaleString('es-CL')}.`,
      metrics: [
        {
          label: 'Participación',
          value: statement.totals.expenses
            ? `${Math.round((amount / statement.totals.expenses) * 100)}%`
            : '0%',
          trend: amount > 0 ? 'up' : 'neutral',
          helperText: 'Proporción sobre el total de gastos',
        },
      ],
    })
  }

  const recommendations: PersonalizedRecommendation[] = []

  if (netFlow > 0) {
    recommendations.push({
      id: createId('recommendation'),
      title: 'Asigna tu excedente a una meta',
      description:
        'Reserva parte del superávit para avanzar en tu fondo de emergencia o inversiones.',
      score: 0.8,
      category: 'Ahorro',
      explanation: 'Detectamos un saldo positivo tras tus movimientos más recientes.',
    })
  } else {
    recommendations.push({
      id: createId('recommendation'),
      title: 'Reduce gastos variables',
      description:
        'Identificamos categorías con alto peso en tus egresos. Considera fijar un presupuesto semanal.',
      score: 0.74,
      category: 'Control de gastos',
      explanation: 'Tus gastos superan tus ingresos en el período analizado.',
    })
  }

  if (incomeEntries[0]) {
    const [category] = incomeEntries[0]
    recommendations.push({
      id: createId('recommendation'),
      title: 'Diversifica tus ingresos',
      description: `El ${
        incomeEntries[0][1] && statement.totals.income
          ? Math.round((incomeEntries[0][1] / statement.totals.income) * 100)
          : 0
      }% proviene de ${category}. Evalúa alternativas complementarias.`,
      score: 0.66,
      category: 'Ingresos',
      explanation: 'Tus ingresos dependen principalmente de una sola fuente.',
    })
  }

  return {
    forecastSummary: {
      modelType: 'demo_projection',
      generatedAt: new Date().toISOString(),
      horizonDays: 42,
      historyDays: 90,
      forecasts,
      trend: {
        direction,
        change: clampNumber(netFlow),
        changePercentage: Number.parseFloat((savingsRate / 100).toFixed(4)),
      },
    },
    predictiveAlerts: alerts,
    insights,
    recommendations,
  }
}

const buildGoal = ({
  id,
  name,
  description,
  category,
  targetAmount,
  initialAmount,
  currentAmount,
  expectedMonthlyContribution,
  startDate,
  targetDate,
}: {
  id: string
  name: string
  description: string
  category: string
  targetAmount: number
  initialAmount: number
  currentAmount: number
  expectedMonthlyContribution: number
  startDate: Date
  targetDate: Date
}) => {
  const now = new Date()
  const monthsElapsed = Math.max(0, differenceInMonths(startDate, now))
  const expectedAmountByNow = expectedMonthlyContribution
    ? initialAmount + expectedMonthlyContribution * monthsElapsed
    : initialAmount
  const deviationAmount = currentAmount - expectedAmountByNow
  const deviationRatio = expectedAmountByNow
    ? deviationAmount / expectedAmountByNow
    : 0
  const progressPercentage = targetAmount
    ? Math.min(100, (currentAmount / targetAmount) * 100)
    : 0
  const pace = paceFromDeviation(deviationRatio, progressPercentage)

  const eta =
    pace === 'completed' || expectedMonthlyContribution <= 0
      ? null
      : new Date(
          now.getTime() +
            Math.max(
              0,
              ((targetAmount - currentAmount) / expectedMonthlyContribution) * 30 * 86_400_000
            )
        ).toISOString()

  const midPoint = new Date(startDate)
  midPoint.setMonth(startDate.getMonth() + Math.max(1, Math.floor(monthsElapsed / 2)))

  const progressHistory = [
    {
      id: createId('goal-progress'),
      actualAmount: clampNumber(initialAmount),
      expectedAmount: clampNumber(initialAmount),
      recordedAt: startDate.toISOString(),
    },
    {
      id: createId('goal-progress'),
      actualAmount: clampNumber((initialAmount + currentAmount) / 2),
      expectedAmount: clampNumber(
        expectedMonthlyContribution
          ? initialAmount + expectedMonthlyContribution * Math.max(1, monthsElapsed / 2)
          : initialAmount
      ),
      recordedAt: midPoint.toISOString(),
    },
    {
      id: createId('goal-progress'),
      actualAmount: clampNumber(currentAmount),
      expectedAmount: clampNumber(expectedAmountByNow),
      recordedAt: now.toISOString(),
    },
  ]

  return {
    id,
    name,
    description,
    category,
    status: pace === 'completed' ? 'COMPLETED' : 'ACTIVE',
    targetAmount: clampNumber(targetAmount),
    initialAmount: clampNumber(initialAmount),
    expectedMonthlyContribution: clampNumber(expectedMonthlyContribution),
    deviationThreshold: 0.15,
    startDate: startDate.toISOString(),
    targetDate: targetDate.toISOString(),
    metrics: {
      totalActual: clampNumber(currentAmount),
      expectedAmountByNow: clampNumber(expectedAmountByNow),
      deviationAmount: clampNumber(deviationAmount),
      deviationRatio,
      progressPercentage,
      pace,
      eta,
      lastRecordedAt: now.toISOString(),
    },
    progressHistory,
  }
}

const buildGoalsFromStatement = (
  statement: NormalizedStatement
): GoalsApiResponse => {
  const now = new Date()
  const startDate = new Date(now)
  startDate.setMonth(now.getMonth() - 3)

  const emergencyTarget = Math.max(clampNumber(statement.totals.expenses * 3), 500_000)
  const emergencyInitial = Math.max(100_000, Math.round(emergencyTarget * 0.15))
  const emergencyCurrent = Math.max(
    emergencyInitial,
    clampNumber(statement.totals.balance * 0.4)
  )
  const emergencyTargetDate = new Date(now)
  emergencyTargetDate.setMonth(now.getMonth() + 8)
  const emergencyExpectedContribution = Math.max(
    50_000,
    Math.round((emergencyTarget - emergencyInitial) / 8)
  )

  const emergencyGoal = buildGoal({
    id: createId('goal'),
    name: 'Fondo de emergencia',
    description: 'Ahorro destinado a cubrir imprevistos equivalentes a varios meses.',
    category: 'Seguridad',
    targetAmount: emergencyTarget,
    initialAmount: emergencyInitial,
    currentAmount: emergencyCurrent,
    expectedMonthlyContribution: emergencyExpectedContribution,
    startDate,
    targetDate: emergencyTargetDate,
  })

  const savingsCapacity = Math.max(0, statement.totals.income - statement.totals.expenses)
  const savingsTarget = Math.max(clampNumber(statement.totals.income * 1.5), 750_000)
  const savingsInitial = Math.max(80_000, Math.round(savingsTarget * 0.1))
  const savingsCurrent = Math.max(
    savingsInitial,
    clampNumber(savingsInitial + savingsCapacity * 0.5)
  )
  const savingsTargetDate = new Date(now)
  savingsTargetDate.setMonth(now.getMonth() + 10)
  const savingsExpectedContribution = Math.max(
    50_000,
    Math.round(
      (savingsTarget - savingsInitial) /
        Math.max(1, differenceInMonths(now, savingsTargetDate))
    )
  )

  const savingsGoal = buildGoal({
    id: createId('goal'),
    name: 'Ahorro programado',
    description: 'Acumula fondos para tus próximas metas personales o inversiones.',
    category: 'Ahorro',
    targetAmount: savingsTarget,
    initialAmount: savingsInitial,
    currentAmount: savingsCurrent,
    expectedMonthlyContribution: savingsExpectedContribution,
    startDate,
    targetDate: savingsTargetDate,
  })

  const goals = [emergencyGoal, savingsGoal]

  const summary = goals.reduce(
    (acc, goal) => {
      acc.total += 1
      if (goal.status === 'ACTIVE') acc.active += 1
      if (goal.status === 'COMPLETED') acc.completed += 1

      switch (goal.metrics.pace) {
        case 'ahead':
          acc.ahead += 1
          break
        case 'off_track':
          acc.offTrack += 1
          break
        case 'on_track':
          acc.onTrack += 1
          break
        case 'completed':
          acc.completed += goal.status === 'COMPLETED' ? 0 : 1
          break
        default:
          break
      }

      return acc
    },
    { total: 0, active: 0, completed: 0, onTrack: 0, offTrack: 0, ahead: 0 }
  )

  return { goals, summary }
}

const buildNotificationsFromStatement = (
  statement: NormalizedStatement,
  overview: DashboardOverviewResponse
): DashboardNotificationsResponse => {
  const now = new Date()
  const transactionsCount = statement.transactions.length
  const netFlow = statement.totals.income - statement.totals.expenses
  const topExpense = Object.entries(statement.expenseByCategory)
    .sort(([, amountA], [, amountB]) => amountB - amountA)
    .at(0)

  const notifications = [
    {
      id: createId('notification'),
      message: `Analizamos ${transactionsCount} transacciones de tu cartola y actualizamos tu tablero demo.`,
      read: false,
      channel: 'in_app' as const,
      severity: 'info' as const,
      createdAt: now.toISOString(),
    },
  ]

  if (topExpense) {
    const [category, amount] = topExpense
    notifications.push({
      id: createId('notification'),
      message: `Detectamos ${clampNumber(amount).toLocaleString('es-CL')} en gastos de ${category} durante el período analizado.`,
      read: false,
      channel: 'push' as const,
      severity: amount / (statement.totals.expenses || 1) > 0.3 ? 'warning' : 'info',
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      metadata: { category, amount: clampNumber(amount) },
    })
  }

  notifications.push({
    id: createId('notification'),
    message:
      netFlow >= 0
        ? 'Tu saldo proyectado se mantiene positivo. Considera aumentar tus aportes a metas.'
        : 'Tu flujo de caja está negativo. Revisamos recomendaciones para equilibrarlo.',
    read: false,
    channel: 'email' as const,
    severity: netFlow >= 0 ? 'info' : 'critical',
    createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
    metadata: {
      balance: overview.totals.balance,
      netFlow: clampNumber(netFlow),
    },
  })

  return {
    notifications,
    preferences: {
      email: true,
      push: true,
      sms: false,
      mutedEvents: [],
    },
  }
}

type DemoFinancialDataContextValue = {
  sessionId: string | null
  setSessionId: (sessionId: string) => void
  statement: NormalizedStatement | null
  overview: DashboardOverviewResponse | null
  intelligence: DashboardIntelligenceResponse | null
  notifications: DashboardNotificationsResponse | null
  goals: GoalsApiResponse | null
  financialSummary: FinancialSummary | null
  updateFromStatement: (statement: NormalizedStatement) => void
  reset: () => void
}

const DemoFinancialDataContext =
  createContext<DemoFinancialDataContextValue | undefined>(undefined)

export function DemoFinancialDataProvider({
  children,
}: {
  children: ReactNode
}) {
  const queryClient = useQueryClient()
  const [sessionId, setSessionIdState] = useState<string | null>(null)
  const [statement, setStatement] = useState<NormalizedStatement | null>(null)
  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null)
  const [intelligence, setIntelligence] =
    useState<DashboardIntelligenceResponse | null>(null)
  const [notifications, setNotifications] =
    useState<DashboardNotificationsResponse | null>(null)
  const [goals, setGoals] = useState<GoalsApiResponse | null>(null)
  const [financialSummary, setFinancialSummary] =
    useState<FinancialSummary | null>(null)

  const setSessionId = useCallback((value: string) => {
    setSessionIdState(value)
  }, [])

  const updateFromStatement = useCallback(
    (nextStatement: NormalizedStatement) => {
      const nextOverview = buildOverviewFromStatement(nextStatement)
      const nextIntelligence = buildIntelligenceFromStatement(nextStatement, nextOverview)
      const nextGoals = buildGoalsFromStatement(nextStatement)
      const nextNotifications = buildNotificationsFromStatement(nextStatement, nextOverview)
      const nextSummary = buildFinancialSummaryFromStatement(nextStatement)

      setStatement(nextStatement)
      setOverview(nextOverview)
      setIntelligence(nextIntelligence)
      setGoals(nextGoals)
      setNotifications(nextNotifications)
      setFinancialSummary(nextSummary)

      queryClient.setQueryData(queryKeys.dashboard.overview(), nextOverview)
      queryClient.setQueryData(queryKeys.dashboard.intelligence(), nextIntelligence)
      queryClient.setQueryData(queryKeys.dashboard.notifications(), nextNotifications)
    },
    [queryClient]
  )

  const reset = useCallback(() => {
    setStatement(null)
    setOverview(null)
    setIntelligence(null)
    setGoals(null)
    setNotifications(null)
    setFinancialSummary(null)

    queryClient.removeQueries({
      queryKey: queryKeys.dashboard.overview(),
      exact: true,
    })
    queryClient.removeQueries({
      queryKey: queryKeys.dashboard.intelligence(),
      exact: true,
    })
    queryClient.removeQueries({
      queryKey: queryKeys.dashboard.notifications(),
      exact: true,
    })
  }, [queryClient])

  const value = useMemo<DemoFinancialDataContextValue>(
    () => ({
      sessionId,
      setSessionId,
      statement,
      overview,
      intelligence,
      notifications,
      goals,
      financialSummary,
      updateFromStatement,
      reset,
    }),
    [
      sessionId,
      setSessionId,
      statement,
      overview,
      intelligence,
      notifications,
      goals,
      financialSummary,
      updateFromStatement,
      reset,
    ]
  )

  return (
    <DemoFinancialDataContext.Provider value={value}>
      {children}
    </DemoFinancialDataContext.Provider>
  )
}

export const useDemoFinancialData = () => {
  const context = useContext(DemoFinancialDataContext)
  if (context === undefined) {
    throw new Error(
      'useDemoFinancialData debe utilizarse dentro de un DemoFinancialDataProvider'
    )
  }
  return context
}
