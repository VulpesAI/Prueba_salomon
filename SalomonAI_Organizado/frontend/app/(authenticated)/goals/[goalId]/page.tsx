'use client'

import Link from "next/link"
import { useMemo } from "react"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarCheck2,
  CalendarDays,
  Share2,
  Wallet,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useFinancialGoals } from "@/hooks/useFinancialGoals"
import type { FinancialGoal, GoalPace } from "@/types/goals"

const currencyFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})

const formatDate = (value: Date | string | null | undefined) => {
  if (!value) return "Sin definir"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "Sin definir"
  return dateFormatter.format(date)
}

const monthsDifference = (from: Date, to: Date) => {
  const years = to.getFullYear() - from.getFullYear()
  const months = to.getMonth() - from.getMonth()
  const adjustment = to.getDate() >= from.getDate() ? 0 : -1
  return years * 12 + months + adjustment
}

const getProgressValue = (goal: FinancialGoal) => {
  const percentage = goal.metrics.progressPercentage ?? 0
  return Math.max(0, Math.min(100, Math.round(percentage)))
}

const getNextContributionDate = (goal: FinancialGoal) => {
  const checkpoints = [
    goal.metrics.lastRecordedAt,
    ...goal.progressHistory.map((item) => item.recordedAt),
    goal.startDate,
  ].filter((value): value is string => Boolean(value))

  const baseDate = checkpoints
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? new Date()

  const targetDate = new Date(goal.targetDate)

  let candidate = new Date(baseDate)
  candidate.setMonth(candidate.getMonth() + 1)

  const now = new Date()
  if (candidate.getTime() <= now.getTime()) {
    candidate = new Date(now)
    candidate.setDate(candidate.getDate() + 7)
  }

  if (!Number.isNaN(targetDate.getTime()) && candidate.getTime() > targetDate.getTime()) {
    return targetDate
  }

  return candidate
}

const buildRecommendations = (goal: FinancialGoal) => {
  const recommendations: string[] = []

  if (goal.expectedMonthlyContribution && goal.expectedMonthlyContribution > 0) {
    recommendations.push(
      `Mantén un aporte mensual cercano a ${currencyFormatter.format(goal.expectedMonthlyContribution)} para cumplir tu plan.`,
    )
  } else {
    recommendations.push(
      "Define un aporte mensual automático para asegurar un progreso constante.",
    )
  }

  const deviation = goal.metrics.deviationAmount
  if (deviation < 0) {
    recommendations.push(
      `Refuerza tus aportes con ${currencyFormatter.format(Math.abs(deviation))} adicionales para volver a la ruta proyectada.`,
    )
  } else if (deviation > 0) {
    recommendations.push(
      `Tienes ${currencyFormatter.format(deviation)} por encima del plan; evalúa adelantar pagos o crear un nuevo objetivo.`,
    )
  } else {
    recommendations.push(
      "Revisa tus contribuciones recientes para mantener la consistencia respecto al plan original.",
    )
  }

  const now = new Date()
  const targetDate = new Date(goal.targetDate)
  const remainingMonths = Number.isNaN(targetDate.getTime())
    ? 0
    : Math.max(0, monthsDifference(now, targetDate))

  recommendations.push(
    remainingMonths > 1
      ? `Quedan aproximadamente ${remainingMonths} meses para esta meta; ajusta tus aportes si tu situación cambia.`
      : "Estás próximo a alcanzar esta meta; monitorea los últimos movimientos para consolidarla.",
  )

  return Array.from(new Set(recommendations))
}

type TimelineStatus = "completed" | "upcoming" | "delayed"

type TimelineItem = {
  id: string
  status: TimelineStatus
  date: string | Date
  title: string
  description: string
}

const timelineBadgeStyles: Record<TimelineStatus, string> = {
  completed: "bg-success text-success-foreground",
  upcoming: "bg-primary text-primary-foreground",
  delayed: "bg-warning text-warning-foreground",
}

const timelineDotStyles: Record<TimelineStatus, string> = {
  completed: "bg-success border-success/60",
  upcoming: "bg-primary border-primary/40",
  delayed: "bg-warning border-warning/60",
}

const timelineLabels: Record<TimelineStatus, string> = {
  completed: "Completado",
  upcoming: "Próximo",
  delayed: "Requiere atención",
}

const paceCopy: Record<GoalPace, string> = {
  ahead: "Vas por delante del objetivo planeado; considera adelantar hitos clave.",
  on_track: "Mantienes un ritmo saludable para llegar a la fecha objetivo.",
  off_track: "Incrementa tus aportes o reprograma compromisos para retomar el ritmo.",
  completed: "Completaste esta meta; evalúa reasignar recursos a nuevos objetivos.",
}

const buildTimeline = (goal: FinancialGoal): TimelineItem[] => {
  const now = new Date()
  const history = goal.progressHistory
    .slice()
    .sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
    )

  const items: TimelineItem[] = history.map((entry, index) => {
    const recordedAt = new Date(entry.recordedAt)
    const isPast = recordedAt.getTime() <= now.getTime()
    const status: TimelineStatus = isPast
      ? entry.expectedAmount && entry.actualAmount < entry.expectedAmount
        ? "delayed"
        : "completed"
      : "upcoming"

    const title = entry.note?.trim().length
      ? entry.note
      : `Registro de aporte ${index + 1}`

    return {
      id: entry.id,
      status,
      date: entry.recordedAt,
      title,
      description: `Saldo acumulado: ${currencyFormatter.format(entry.actualAmount)}`,
    }
  })

  const targetStatus: TimelineStatus =
    goal.metrics.pace === "completed"
      ? "completed"
      : goal.metrics.pace === "off_track"
        ? "delayed"
        : "upcoming"

  items.push({
    id: `${goal.id}-target`,
    status: targetStatus,
    date: goal.targetDate,
    title: "Fecha objetivo",
    description: `Meta de ${currencyFormatter.format(goal.targetAmount)}`,
  })

  return items
}

type DerivedMetric = {
  label: string
  value: string
  helper?: string
}

type DerivedGoalDetail = {
  id: string
  title: string
  description: string
  category: string
  currentAmount: number
  targetAmount: number
  monthlyContribution: number | null
  pace: GoalPace
  dueDate: string
  nextContributionDate: Date
  metrics: DerivedMetric[]
  timeline: TimelineItem[]
  insights: string[]
  progress: number
}

const buildGoalDetail = (goal: FinancialGoal): DerivedGoalDetail => {
  const progress = getProgressValue(goal)
  const nextContributionDate = getNextContributionDate(goal)
  const metrics: DerivedMetric[] = [
    {
      label: "Progreso acumulado",
      value: `${progress}%`,
      helper: `${currencyFormatter.format(goal.metrics.totalActual)} de ${currencyFormatter.format(goal.targetAmount)}`,
    },
    {
      label: "Aporte mensual",
      value:
        goal.expectedMonthlyContribution && goal.expectedMonthlyContribution > 0
          ? currencyFormatter.format(goal.expectedMonthlyContribution)
          : "Sin definir",
      helper:
        goal.expectedMonthlyContribution && goal.expectedMonthlyContribution > 0
          ? "Promedio sugerido según tu planificación."
          : "Configura un aporte recurrente para automatizar tu avance.",
    },
    {
      label: "Fecha objetivo",
      value: formatDate(goal.targetDate),
      helper: goal.metrics.eta ? `ETA proyectada: ${formatDate(goal.metrics.eta)}` : undefined,
    },
  ]

  const timeline = buildTimeline(goal)
  const insights = buildRecommendations(goal)

  return {
    id: goal.id,
    title: goal.name,
    description:
      goal.description?.trim().length
        ? goal.description
        : "No registraste una descripción para esta meta.",
    category: goal.category ?? "Sin categoría",
    currentAmount: goal.metrics.totalActual,
    targetAmount: goal.targetAmount,
    monthlyContribution: goal.expectedMonthlyContribution,
    pace: goal.metrics.pace,
    dueDate: goal.targetDate,
    nextContributionDate,
    metrics,
    timeline,
    insights,
    progress,
  }
}

export default function GoalDetailPage() {
  const params = useParams<{ goalId: string }>()
  const { goals, isLoading, error } = useFinancialGoals()

  const decodedGoalId = useMemo(() => {
    const raw = params?.goalId ?? ""
    try {
      return decodeURIComponent(raw)
    } catch (err) {
      console.warn("[GoalDetailPage] Could not decode goal id", err)
      return raw
    }
  }, [params?.goalId])

  const goal = useMemo(
    () => goals.find((item) => item.id === decodedGoalId),
    [decodedGoalId, goals],
  )

  const detail = useMemo(
    () => (goal ? buildGoalDetail(goal) : null),
    [goal],
  )

  const backLink = (
    <Link
      href="/goals"
      className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
    >
      <ArrowLeft className="h-4 w-4" /> Regresar a metas
    </Link>
  )

  if (error) {
    return (
      <div className="space-y-4">
        {backLink}
        <Card>
          <CardHeader>
            <CardTitle>No pudimos cargar la meta solicitada</CardTitle>
            <CardDescription>
              {error}. Intenta nuevamente más tarde o revisa tu conexión.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild>
              <Link href="/goals">Volver al listado</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (isLoading && !detail) {
    return (
      <div className="space-y-4">
        {backLink}
        <Card>
          <CardHeader>
            <CardTitle>Cargando meta financiera</CardTitle>
            <CardDescription>
              Estamos preparando la información más reciente de tu objetivo seleccionado.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="space-y-4">
        {backLink}
        <Card>
          <CardHeader>
            <CardTitle>Meta no encontrada</CardTitle>
            <CardDescription>
              No pudimos encontrar información para la meta solicitada. Revisa el enlace e intenta nuevamente.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild>
              <Link href="/goals">Volver al listado</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {backLink}

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">{detail.title}</h1>
          <p className="text-muted-foreground">{detail.description}</p>
        </div>
        <div className="flex flex-col items-start gap-3 text-sm md:items-end">
          <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {detail.category}
          </span>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-foreground">
              Fecha objetivo: {formatDate(detail.dueDate)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Resumen de progreso</CardTitle>
              <CardDescription>
                Controla aportes acumulados, ritmo estimado y próximo recordatorio.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>Avance general</span>
                  <span>{detail.progress}%</span>
                </div>
                <Progress value={detail.progress} className="h-2" />
              </div>
              <dl className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <dt className="text-sm text-muted-foreground">Acumulado</dt>
                  <dd className="text-xl font-semibold text-foreground">
                    {currencyFormatter.format(detail.currentAmount)}
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-sm text-muted-foreground">Objetivo</dt>
                  <dd className="text-xl font-semibold text-foreground">
                    {currencyFormatter.format(detail.targetAmount)}
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-sm text-muted-foreground">Aporte mensual</dt>
                  <dd className="text-xl font-semibold text-foreground">
                    {detail.monthlyContribution && detail.monthlyContribution > 0
                      ? currencyFormatter.format(detail.monthlyContribution)
                      : "Sin definir"}
                  </dd>
                </div>
              </dl>
              <div className="rounded-lg bg-muted/60 p-4 text-sm">
                <p className="font-medium text-foreground">Próxima contribución</p>
                <p className="mt-1 text-foreground">{formatDate(detail.nextContributionDate)}</p>
                <p className="mt-2 text-muted-foreground">{paceCopy[detail.pace]}</p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href="/accounts">Ajustar aporte automático</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/transactions/classification">Ver movimientos relacionados</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline de hitos</CardTitle>
              <CardDescription>Fechas clave, responsables y próximos pasos.</CardDescription>
            </CardHeader>
            <CardContent>
              {detail.timeline.length ? (
                <ol className="relative space-y-6 border-s border-border ps-6">
                  {detail.timeline.map((item) => (
                    <li key={item.id} className="relative space-y-2">
                      <span
                        className={`absolute -start-[9px] mt-1.5 h-4 w-4 rounded-full border-2 ${timelineDotStyles[item.status]}`}
                        aria-hidden
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${timelineBadgeStyles[item.status]}`}
                        >
                          {timelineLabels[item.status]}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(item.date)}
                        </span>
                      </div>
                      <p className="text-base font-semibold text-foreground">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aún no registras hitos para esta meta. Define recordatorios para visualizar avances relevantes.
                </p>
              )}
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" size="sm">
                <Link href={`/goals/${detail.id}/editar?step=timeline`} className="inline-flex items-center gap-1">
                  <CalendarCheck2 className="h-4 w-4" />
                  Programar nuevo hito
                </Link>
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recomendaciones e insights</CardTitle>
              <CardDescription>
                Acciones sugeridas para mantener el ritmo y optimizar tus recursos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {detail.insights.map((insight) => (
                  <li key={insight} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/transactions">Revisar transacciones etiquetadas</Link>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link href="/goals/compartir" className="inline-flex items-center gap-1">
                  <Share2 className="h-4 w-4" /> Compartir avance
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Métricas clave</CardTitle>
              <CardDescription>Indicadores que siguen tu ritmo actual.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {detail.metrics.map((metric) => (
                  <li key={metric.label} className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                    <p className="text-lg font-semibold text-foreground">{metric.value}</p>
                    {metric.helper ? (
                      <p className="text-xs text-muted-foreground">{metric.helper}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Acciones rápidas</CardTitle>
              <CardDescription>
                Ajusta aportes o comparte el plan con un par de clics.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full">
                <Link href="/accounts" className="inline-flex items-center justify-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Ajustar aporte
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/goals/compartir" className="inline-flex items-center justify-center gap-2">
                  <Share2 className="h-4 w-4" />
                  Compartir progreso
                </Link>
              </Button>
              <Button asChild variant="secondary" className="w-full">
                <Link href="/transactions/classification" className="inline-flex items-center justify-center gap-2">
                  <ArrowUpRight className="h-4 w-4" />
                  Etiquetar transacciones
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
