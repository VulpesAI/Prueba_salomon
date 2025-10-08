'use client'

import { useMemo } from "react"
import type { Route } from "next"

import { useDemoFinancialData } from "@/context/DemoFinancialDataContext"
import type { FinancialGoal } from "@/types/goals"

export type AssistantMessageStatus = "sent" | "loading" | "error"
export type AssistantMessageRole = "user" | "assistant" | "system"

export interface AssistantMessage {
  id: string
  role: AssistantMessageRole
  content: string
  timestamp: string
  status?: AssistantMessageStatus
  note?: string
}

export type AssistantConversationState = "idle" | "responding" | "error"

export interface AssistantConversationSummary {
  highlights: string[]
  nextSteps: string[]
  blockers?: string[]
}

export interface AssistantConversation {
  id: string
  title: string
  updatedAt: string
  preview: string
  pinned?: boolean
  state: AssistantConversationState
  messages: AssistantMessage[]
  summary: AssistantConversationSummary
}

export type PlaybookStatus = "scheduled" | "running" | "ready" | "error"

export interface AssistantPlaybook {
  id: string
  name: string
  description: string
  status: PlaybookStatus
  updatedAt: string
  successRate: number
  owner: string
  nextRun?: string
}

export interface AssistantResource {
  id: string
  title: string
  description: string
  href: Route
  type: "reporte" | "guía" | "dashboard"
  cta: string
}

export interface AssistantAutomation {
  id: string
  title: string
  description: string
  impact: string
  href: Route
}

export interface AssistantMockData {
  conversations: AssistantConversation[]
  playbooks: AssistantPlaybook[]
  resources: AssistantResource[]
  automations: AssistantAutomation[]
}

const listFormatter = new Intl.ListFormat("es-CL", {
  style: "long",
  type: "conjunction",
})

const percentFormatter = new Intl.NumberFormat("es-CL", {
  style: "percent",
  maximumFractionDigits: 1,
})

function formatClp(value?: number | null): string {
  const amount = Number.isFinite(value ?? NaN) ? Number(value) : 0
  return amount.toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  })
}

function formatShare(amount: number, total: number): string {
  if (!total) return percentFormatter.format(0)
  return percentFormatter.format(amount / total)
}

function buildGoalLine(goal: FinancialGoal): string {
  return `• ${goal.name}: ${goal.metrics.progressPercentage.toFixed(0)}% completado (${formatClp(goal.metrics.totalActual)} de ${formatClp(goal.targetAmount)})`
}

function formatList(items: string[]): string {
  if (items.length === 0) return "sin categorías destacadas"
  if (items.length === 1) return items[0]
  return listFormatter.format(items)
}

export function useAssistantMock(): AssistantMockData {
  const { statement, goals, notifications } = useDemoFinancialData()

  return useMemo(() => {
    const totals = statement?.totals ?? { income: 0, expenses: 0, balance: 0 }
    const totalExpenses = totals.expenses ?? 0
    const netFlow = (totals.income ?? 0) - (totals.expenses ?? 0)
    const expenseEntries = Object.entries(statement?.expenseByCategory ?? {}).sort(
      ([, amountA], [, amountB]) => amountB - amountA
    )
    const topExpenseEntries = expenseEntries.slice(0, 3)
    const topExpenseNames = topExpenseEntries.map(([category]) => category)
    const expenseLines = topExpenseEntries.map(
      ([category, amount]) =>
        `• ${category}: ${formatClp(amount)} (${formatShare(amount, totalExpenses)})`
    )
    const transactionsCount = statement?.transactions.length ?? 0
    const reminderBase = totalExpenses ? totalExpenses * 0.25 : 50_000

    const goalsList = goals?.goals ?? []
    const goalSummaryLines = goalsList.map(buildGoalLine)
    const offTrackGoal = goalsList.find((goal) => goal.metrics.pace === "off_track")
    const highlightedGoal = offTrackGoal ?? goalsList[0] ?? null
    const firstGoal = goalsList[0] ?? null
    const lastRecordedAt = firstGoal?.metrics.lastRecordedAt ?? null
    const lastRecordedLabel = lastRecordedAt
      ? new Date(lastRecordedAt).toLocaleDateString("es-CL")
      : "sin fecha"

    const notificationsList = notifications?.notifications ?? []
    const unreadNotifications = notificationsList.slice(0, 3)
    const relevantAlert =
      notificationsList.find((notification) => notification.severity !== "info") ??
      notificationsList[0] ??
      null
    const alertLines = unreadNotifications.map(
      (notification) => `• ${notification.message}`
    )

    const conversations: AssistantConversation[] = [
      {
        id: "spending-overview",
        title: "Seguimiento de gastos demo",
        updatedAt: "Hace 2 horas",
        preview:
          topExpenseEntries.length > 0
            ? `Tus gastos suman ${formatClp(totalExpenses)}; ${topExpenseNames[0]} lidera el consumo.`
            : "Aún no registras gastos clasificados en la cartola demo.",
        pinned: true,
        state: "responding",
        messages: [
          {
            id: "m-1",
            role: "user",
            content: "¿En qué estás viendo mis gastos más altos este mes?",
            timestamp: "09:12",
            status: "sent",
          },
          {
            id: "m-2",
            role: "assistant",
            content:
              `Tus gastos del período suman ${formatClp(totalExpenses)}. ` +
              (expenseLines.length
                ? `Las categorías con mayor peso son:\n${expenseLines.join("\n")}`
                : "No encuentro gastos categorizados en tu cartola demo.") +
              ` Tu saldo disponible queda en ${formatClp(totals.balance ?? 0)} y tu flujo neto es ${formatClp(netFlow)}.`,
            timestamp: "09:13",
            status: "sent",
          },
          {
            id: "m-3",
            role: "assistant",
            content:
              "Estoy revisando los movimientos de tus principales categorías para proponer recortes concretos…",
            timestamp: "09:15",
            status: "loading",
            note: topExpenseEntries.length
              ? `Priorizando ${formatList(topExpenseNames)}.`
              : "Esperando tus próximos gastos categorizados.",
          },
        ],
        summary: {
          highlights: [
            `Tus gastos registrados alcanzan ${formatClp(totalExpenses)} en la cartola demo.`,
            topExpenseEntries.length
              ? `${topExpenseNames[0]} representa ${formatShare(
                  topExpenseEntries[0][1],
                  totalExpenses
                )} de tus egresos.`
              : "Aún no hay categorías con peso relevante.",
            `Tu saldo actual es ${formatClp(totals.balance ?? 0)} con un flujo neto de ${formatClp(netFlow)}.`,
          ],
          nextSteps: [
            topExpenseEntries.length
              ? `Revisa tus compras en ${topExpenseNames[0]} para identificar ahorros inmediatos.`
              : "Carga nuevos movimientos para analizar tus gastos.",
            `Programa un recordatorio si alguno de tus gastos supera ${formatClp(reminderBase)} en el mes.`,
            `Exporta tu cartola demo y guarda un respaldo de los ${transactionsCount} movimientos analizados.`,
          ],
        },
      },
      {
        id: "goals-progress",
        title: "Progreso de tus metas",
        updatedAt: "Hoy",
        preview:
          highlightedGoal
            ? `${highlightedGoal.name} va en ${highlightedGoal.metrics.progressPercentage.toFixed(0)}% de avance.`
            : "Configura tus metas para ver su avance en tiempo real.",
        state: offTrackGoal ? "error" : "idle",
        messages: [
          {
            id: "m-4",
            role: "user",
            content: "Muéstrame cómo van mis metas de ahorro y si debo ajustar aportes.",
            timestamp: "08:21",
            status: "sent",
          },
          {
            id: "m-5",
            role: "assistant",
            content: goalsList.length
              ? `Tienes ${goalsList.length} metas activas. ${goalSummaryLines.join(" ")}${
                  offTrackGoal
                    ? ` ${offTrackGoal.name} presenta una brecha de ${formatClp(
                        Math.abs(offTrackGoal.metrics.deviationAmount)
                      )} respecto al ritmo esperado.`
                    : " Todas avanzan dentro del ritmo proyectado."
                }`
              : "Aún no registras metas activas en la cartola demo.",
            timestamp: "08:22",
            status: goalsList.length ? "sent" : "error",
            note: goalsList.length
              ? "Datos calculados con tus metas demo."
              : "Necesitas definir al menos una meta para ver recomendaciones.",
          },
        ],
        summary: {
          highlights: goalsList.length
            ? [
                `Tienes ${goalsList.length} metas activas y ${goals?.summary.active ?? 0} en seguimiento.`,
                ...goalSummaryLines.slice(0, 2).map((line) => line.replace("• ", "")),
              ]
            : ["No hay metas activas registradas."],
          nextSteps: goalsList.length
            ? [
                highlightedGoal
                  ? `Aporta ${formatClp(highlightedGoal.expectedMonthlyContribution ?? 0)} extra a ${highlightedGoal.name} este mes.`
                  : "Registra un nuevo objetivo para comenzar a medirlo.",
                `Revisa el historial de aportes para confirmar la última actualización (${lastRecordedLabel}).`,
                `Activa un recordatorio mensual cuando alcances ${formatClp(firstGoal?.targetAmount ?? 0)} en tu objetivo principal.`,
              ]
            : [
                "Crea tu primera meta para activar el seguimiento en el asistente.",
                "Define un monto objetivo y tu aporte mensual estimado.",
              ],
          blockers: offTrackGoal
            ? [`${offTrackGoal.name} necesita un ajuste porque su desvío es de ${formatClp(
                Math.abs(offTrackGoal.metrics.deviationAmount)
              )}.`]
            : undefined,
        },
      },
      {
        id: "financial-alerts",
        title: "Alertas recientes",
        updatedAt: "Hace 3 horas",
        preview:
          relevantAlert
            ? relevantAlert.message
            : "No registras alertas pendientes en tu bandeja demo.",
        state: relevantAlert?.severity === "critical" ? "error" : "idle",
        messages: [
          {
            id: "m-6",
            role: "user",
            content: "Resume las alertas que generaste con mis movimientos más recientes.",
            timestamp: "12:40",
            status: "sent",
          },
          {
            id: "m-7",
            role: "assistant",
            content: alertLines.length
              ? `Encontré estas alertas para ti:\n${alertLines.join("\n")}`
              : "No tengo alertas nuevas en tu bandeja demo.",
            timestamp: "12:41",
            status: "sent",
            note: relevantAlert
              ? `La más relevante es de prioridad ${relevantAlert.severity}.`
              : undefined,
          },
        ],
        summary: {
          highlights: alertLines.length
            ? alertLines.map((line) => line.replace("• ", ""))
            : ["Sin alertas activas en tu demo."],
          nextSteps: [
            relevantAlert
              ? "Ingresa a la bandeja de alertas y márcala como resuelta cuando la gestiones."
              : "Activa notificaciones para recibir avisos sobre tus gastos.",
            `Monitorea tu flujo neto de ${formatClp(netFlow)} para anticipar desbalances.`,
          ],
        },
      },
    ]

    const topExpense = topExpenseEntries[0]
    const playbookCategoryName = topExpense?.[0] ?? "tus gastos principales"
    const playbookCategoryAmount = topExpense?.[1] ?? 0
    const playbookGoal = highlightedGoal

    const playbooks: AssistantPlaybook[] = [
      {
        id: "pb-gastos",
        name: `Control de gastos en ${playbookCategoryName}`,
        description: topExpense
          ? `Revisa tus compras de ${playbookCategoryName}; ya suman ${formatClp(playbookCategoryAmount)} este período.`
          : "Analiza tus gastos para identificar dónde puedes ajustar tu presupuesto.",
        status: topExpense ? "running" : "scheduled",
        updatedAt: "Hace 5 minutos",
        successRate: 0.92,
        owner: "Tú",
        nextRun: topExpense ? "Mañana 09:00" : undefined,
      },
      {
        id: "pb-metas",
        name: playbookGoal ? `Refuerzo de ${playbookGoal.name}` : "Crea tu primera meta",
        description: playbookGoal
          ? `Programa un traspaso automático de ${formatClp(playbookGoal.expectedMonthlyContribution ?? 0)} para mantener el ritmo de tu meta.`
          : "Define un objetivo de ahorro para comenzar a medir tu progreso.",
        status: playbookGoal ? (offTrackGoal ? "error" : "running") : "ready",
        updatedAt: "Hoy",
        successRate: 0.87,
        owner: "Salomón AI",
        nextRun: playbookGoal ? "Próxima semana" : undefined,
      },
      {
        id: "pb-alertas",
        name: "Monitoreo de alertas demo",
        description: relevantAlert
          ? "Mantén la bandeja limpia confirmando las alertas críticas apenas se generen."
          : "Activa notificaciones inteligentes para que te avise ante desviaciones de gasto.",
        status: relevantAlert ? "ready" : "scheduled",
        updatedAt: "Hace 3 horas",
        successRate: 0.9,
        owner: "Tú",
        nextRun: "Hoy 21:00",
      },
    ]

    const resources: AssistantResource[] = [
      {
        id: "rs-cartola",
        title: "Cartola demo por categoría",
        description: `Explora los ${transactionsCount} movimientos registrados y profundiza en ${formatList(
          topExpenseNames
        )}.`,
        href: "/transactions",
        type: "dashboard",
        cta: "Revisar mis movimientos",
      },
      {
        id: "rs-metas",
        title: "Panel de metas personales",
        description: playbookGoal
          ? `Consulta el detalle de ${playbookGoal.name} y ajusta tus aportes mensuales.`
          : "Crea una meta para comenzar a seguir tus ahorros demo.",
        href: "/analytics/forecasts",
        type: "reporte",
        cta: "Abrir panel de metas",
      },
      {
        id: "rs-alertas",
        title: "Bandeja de alertas",
        description: relevantAlert
          ? "Gestiona la alerta más reciente antes de que impacte tu flujo de caja."
          : "Activa recordatorios inteligentes para mantenerte al tanto de tus movimientos.",
        href: "/alerts",
        type: "guía",
        cta: "Ver mis alertas",
      },
    ]

    const automations: AssistantAutomation[] = [
      {
        id: "auto-gastos",
        title: "Alertar sobre tus gastos fuertes",
        description: topExpense
          ? `Recibe avisos si ${playbookCategoryName} supera ${formatClp(playbookCategoryAmount * 1.1)} el próximo mes.`
          : "Configura alertas cuando registres nuevos gastos relevantes.",
        impact: topExpense ? "Impacto alto" : "Impacto medio",
        href: "/alerts",
      },
      {
        id: "auto-metas",
        title: "Automatizar aportes a tus metas",
        description: playbookGoal
          ? `Aparta ${formatClp(playbookGoal.expectedMonthlyContribution ?? 0)} cada mes para ${playbookGoal.name}.`
          : "Define tu objetivo de ahorro y activa aportes recurrentes.",
        impact: "Impacto medio",
        href: "/analytics/forecasts",
      },
      {
        id: "auto-flujo",
        title: "Monitorear flujo neto demo",
        description: `Te aviso si tu flujo neto cae por debajo de ${formatClp(netFlow)} para que ajustes a tiempo.`,
        impact: netFlow < 0 ? "Impacto alto" : "Impacto medio",
        href: "/analytics/insights",
      },
    ]

    return {
      conversations,
      playbooks,
      resources,
      automations,
    }
  }, [goals, notifications, statement])
}
