'use client'

import Link from "next/link"

import {
  ArrowUpRight,
  CalendarDays,
  Compass,
  Layers3,
  PiggyBank,
  Target,
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
import type { FinancialGoal } from "@/types/goals"

import { suggestedGoals } from "./mock-data"

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

const monthsDifference = (from: Date, to: Date) => {
  const years = to.getFullYear() - from.getFullYear()
  const months = to.getMonth() - from.getMonth()
  const adjustment = to.getDate() >= from.getDate() ? 0 : -1
  return years * 12 + months + adjustment
}

const formatDate = (value: Date | string | null | undefined) => {
  if (!value) return "Sin definir"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "Sin definir"
  return dateFormatter.format(date)
}

const getProgressValue = (goal: FinancialGoal) => {
  const percentage = goal.metrics.progressPercentage ?? 0
  return Math.max(0, Math.min(100, Math.round(percentage)))
}

const getProgressTrend = (goal: FinancialGoal) => {
  switch (goal.metrics.pace) {
    case "ahead":
      return "Tu meta avanza más rápido de lo proyectado; considera adelantar próximos hitos."
    case "off_track":
      return "Tus aportes van por debajo del plan esperado; refuerza tus contribuciones para retomar el ritmo."
    case "completed":
      return "Completaste esta meta; reasigna los fondos disponibles a nuevos objetivos."
    default:
      return "Mantienes un ritmo consistente con el plan definido para esta meta."
  }
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

export default function GoalsPage() {
  const { goals, isLoading, error } = useFinancialGoals()

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Metas financieras</h1>
          <p className="text-muted-foreground">
            Crea, prioriza y monitorea objetivos de ahorro o inversión apoyándote en
            recomendaciones inteligentes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/goals/nueva">Registrar nueva meta</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/accounts" className="inline-flex items-center gap-1">
              <PiggyBank className="h-4 w-4" />
              Vincular cuenta de ahorro
            </Link>
          </Button>
        </div>
      </header>

      <section className="space-y-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Metas activas</h2>
            <p className="text-sm text-muted-foreground">
              Visualiza el progreso, aporta a tiempo y revisa recomendaciones personalizadas.
            </p>
          </div>
          <Link
            href="/accounts/balances"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary"
          >
            <Layers3 className="h-4 w-4" />
            Ver cuentas asociadas
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {error && (
            <Card className="md:col-span-2 xl:col-span-3 border-destructive">
              <CardHeader>
                <CardTitle>No pudimos cargar tus metas</CardTitle>
                <CardDescription>
                  {error}. Intenta nuevamente más tarde o revisa tu conexión.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {isLoading && !error && (
            <Card className="md:col-span-2 xl:col-span-3">
              <CardHeader>
                <CardTitle>Cargando metas financieras</CardTitle>
                <CardDescription>
                  Estamos sincronizando la información más reciente para tus objetivos.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {!isLoading && !error && goals.length === 0 && (
            <Card className="md:col-span-2 xl:col-span-3">
              <CardHeader>
                <CardTitle>Aún no registras metas activas</CardTitle>
                <CardDescription>
                  Crea tu primera meta para visualizar recomendaciones y seguimiento personalizado.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {!isLoading && !error &&
            goals.map((goal) => {
              const progress = getProgressValue(goal)
              const recommendations = buildRecommendations(goal)
              const nextContribution = getNextContributionDate(goal)

              return (
                <Card key={goal.id} className="flex flex-col">
                  <CardHeader className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg">{goal.name}</CardTitle>
                        <CardDescription>{goal.category ?? "Sin categoría"}</CardDescription>
                      </div>
                      <Link
                        href={`/goals/${goal.id}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        Detalle
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </div>
                    {goal.description ? (
                      <div className="text-sm text-muted-foreground">{goal.description}</div>
                    ) : null}
                  </CardHeader>
                  <CardContent className="flex-1 space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm font-medium">
                        <span>Progreso</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div className="space-y-1">
                        <dt className="text-muted-foreground">Acumulado</dt>
                        <dd className="font-semibold">
                          {currencyFormatter.format(goal.metrics.totalActual)}
                        </dd>
                      </div>
                      <div className="space-y-1 text-right">
                        <dt className="text-muted-foreground">Objetivo</dt>
                        <dd className="font-semibold">
                          {currencyFormatter.format(goal.targetAmount)}
                        </dd>
                      </div>
                      <div className="space-y-1">
                        <dt className="text-muted-foreground">Aporte mensual</dt>
                        <dd>
                          {goal.expectedMonthlyContribution &&
                          goal.expectedMonthlyContribution > 0
                            ? currencyFormatter.format(goal.expectedMonthlyContribution)
                            : "Sin definir"}
                        </dd>
                      </div>
                      <div className="space-y-1 text-right">
                        <dt className="text-muted-foreground">Fecha objetivo</dt>
                        <dd>{formatDate(goal.targetDate)}</dd>
                      </div>
                    </dl>
                    <div className="rounded-lg bg-muted/60 p-3 text-sm">
                      <p className="font-medium text-foreground">Recomendaciones</p>
                      <ul className="mt-2 space-y-2 text-muted-foreground">
                        {recommendations.map((recommendation) => (
                          <li key={recommendation} className="flex gap-2">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                            <span>{recommendation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col items-start gap-2 border-t bg-muted/40 p-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      <span>Próximo hito: {formatDate(nextContribution)}</span>
                    </div>
                    <p>{getProgressTrend(goal)}</p>
                  </CardFooter>
                </Card>
              )
            })}
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Sugerencias automáticas</h2>
            <p className="text-sm text-muted-foreground">
              Propuestas basadas en tu historial de ingresos, gastos y metas anteriores.
            </p>
          </div>
          <Link
            href="/transactions"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary"
          >
            <Compass className="h-4 w-4" />
            Analizar transacciones etiquetadas
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {suggestedGoals.map((suggested) => (
            <Card key={suggested.id} className="border-dashed">
              <CardHeader>
                <CardTitle className="text-lg">{suggested.title}</CardTitle>
                <CardDescription>{suggested.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Aporte sugerido</span>
                <span className="font-semibold text-foreground">
                  {currencyFormatter.format(suggested.potentialMonthlyContribution)}
                </span>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" className="w-full">
                  <Link
                    href={`/goals/crear?referer=${suggested.id}`}
                    className="inline-flex items-center justify-center gap-1"
                  >
                    <Target className="h-4 w-4" />
                    Evaluar esta meta
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          Acciones rápidas
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Ajustar aportes</CardTitle>
              <CardDescription>
                Modifica montos o frecuencia de contribuciones sin perder el historial.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/accounts">Configurar automatización</Link>
              </Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Compartir progreso</CardTitle>
              <CardDescription>
                Envía actualizaciones a tu equipo o familia para coordinar decisiones financieras.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild variant="secondary" className="w-full">
                <Link href="/goals/compartir">Generar reporte</Link>
              </Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Etiquetas inteligentes</CardTitle>
              <CardDescription>
                Relaciona movimientos bancarios a cada meta y recibe alertas de desviaciones.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild variant="outline" className="w-full">
                <Link href="/transactions/classification">Organizar transacciones</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>
    </div>
  )
}
