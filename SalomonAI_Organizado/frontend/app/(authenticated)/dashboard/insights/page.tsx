"use client"

import Link from "next/link"
import { useMemo } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useDashboardIntelligence } from "@/hooks/dashboard/use-dashboard-intelligence"
import { useDashboardOverview } from "@/hooks/dashboard/use-dashboard-overview"
import { useDemoFinancialData } from "@/context/DemoFinancialDataContext"
import { personalBudgetFallback } from "./mock-data"
import {
  ArrowUpRight,
  Download,
  Radar,
  Share2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react"

const priorityBadgeVariants = {
  alta: "destructive",
  media: "secondary",
  baja: "outline",
} as const

const highlightIconMap = {
  sparkles: Sparkles,
  trendingUp: TrendingUp,
  shield: ShieldCheck,
} as const

type HighlightIconKey = keyof typeof highlightIconMap

const highlightIconOrder: HighlightIconKey[] = ["sparkles", "trendingUp", "shield"]

const versionStatusDotStyles = {
  published: "bg-emerald-500 border-emerald-500/60",
  scheduled: "bg-primary border-primary/40",
  draft: "bg-amber-500 border-amber-500/60",
} as const

const versionStatusLabels = {
  published: "Publicado",
  scheduled: "Programado",
  draft: "Borrador",
} as const

type VersionStatus = keyof typeof versionStatusDotStyles

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "short",
})

const formatCurrency = (value?: number | null) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.abs(typeof value === "number" ? value : 0))

const severityToPriority = {
  high: "alta",
  medium: "media",
  low: "baja",
} as const

const headerIconMap = {
  radar: Radar,
  download: Download,
  share: Share2,
} as const

type HeaderActionIcon = keyof typeof headerIconMap
type HeaderActionVariant = "default" | "outline" | "secondary"

export default function DashboardInsightsPage() {
  const intelligence = useDashboardIntelligence()
  const overview = useDashboardOverview()
  const { goals } = useDemoFinancialData()

  const headerActions = useMemo(() => {
    const horizonDays = intelligence.forecastSummary?.horizonDays
    const savings = overview.totals?.savings ?? null
    const goalsCount = goals?.goals.length ?? 0

    const actions: Array<{
      id: string
      label: string
      href: string
      icon: HeaderActionIcon
      variant: HeaderActionVariant
    }> = [
      {
        id: "forecast",
        label:
          horizonDays && horizonDays > 0
            ? `Proyección ${horizonDays} días`
            : "Ver proyección",
        href: "/dashboard/overview",
        icon: "radar",
        variant: "default",
      },
      {
        id: "download-budget",
        label:
          savings && savings > 0
            ? `Descargar presupuesto (${formatCurrency(savings)})`
            : "Descargar presupuesto",
        href: "/dashboard/overview/exportar-presupuesto",
        icon: "download",
        variant: "outline",
      },
      {
        id: "share-goals",
        label:
          goalsCount > 0
            ? `${goalsCount} hábitos financieros`
            : "Ver hábitos financieros",
        href: "/dashboard/goals",
        icon: "share",
        variant: "secondary",
      },
    ]

    return actions
  }, [goals?.goals.length, intelligence.forecastSummary?.horizonDays, overview.totals?.savings])

  const priorities = useMemo(() => {
    const derived = intelligence.predictiveAlerts.map((alert) => {
      const priority = severityToPriority[alert.severity]
      const amount =
        typeof alert.details?.deficit === "number"
          ? alert.details.deficit
          : typeof alert.details?.surplus === "number"
            ? alert.details.surplus
            : typeof alert.details?.amount === "number"
              ? alert.details.amount
              : null

      const impactLabel = amount ? formatCurrency(amount) : "Seguimiento sugerido"

      const helperByType: Record<string, string> = {
        cashflow: "Revisa tu flujo de caja semanal y prioriza gastos esenciales.",
        spending:
          typeof alert.details?.category === "string"
            ? `Define un tope para ${alert.details.category} y activa recordatorios.`
            : "Define un tope para tus gastos variables y activa recordatorios.",
        savings: "Agenda un aporte automático para reforzar tu ahorro.",
      }

      const helper = helperByType[alert.type] ?? "Organiza tus próximos pasos para mantener equilibrio."

      const summaryParts = [alert.message]
      if (amount) {
        summaryParts.push(
          alert.type === "cashflow"
            ? `Déficit proyectado de ${formatCurrency(amount)}.`
            : alert.type === "savings"
              ? `Superávit estimado de ${formatCurrency(amount)}.`
              : `Monto asociado: ${formatCurrency(amount)}.`,
        )
      }
      if (typeof alert.details?.share === "number") {
        summaryParts.push(`Representa el ${alert.details.share}% de tus gastos.`)
      }

      const actionHref =
        alert.type === "cashflow"
          ? "/dashboard/overview#flujo"
          : alert.type === "savings"
            ? "/dashboard/goals"
            : "/dashboard/transactions"

      const actionLabel =
        alert.type === "cashflow"
          ? "Abrir flujo de caja"
          : alert.type === "savings"
            ? "Planificar ahorro"
            : "Revisar gastos"

      return {
        id: alert.id,
        title: alert.message,
        summary: summaryParts.join(" "),
        impact: impactLabel,
        helper,
        priority,
        actionLabel,
        actionHref,
      }
    })

    return derived.length > 0 ? derived : personalBudgetFallback.priorities
  }, [intelligence.predictiveAlerts])

  const highlights = useMemo(() => {
    const derived = intelligence.insights.slice(0, 3).map((insight, index) => {
      const icon = highlightIconOrder[index] ?? "shield"
      const badgeVariant: "secondary" | "outline" = index === 0 ? "secondary" : "outline"

      return {
        id: insight.id,
        title: insight.title,
        description: insight.description,
        icon,
        badgeLabel:
          insight.highlight ??
          (insight.metrics && insight.metrics[0]
            ? `${insight.metrics[0].label}: ${insight.metrics[0].value}`
            : "Insight"),
        badgeVariant,
      }
    })

    return derived.length > 0 ? derived : personalBudgetFallback.highlights
  }, [intelligence.insights])

  const narratives = useMemo(() => {
    const generatedAt = intelligence.forecastSummary?.generatedAt ?? new Date().toISOString()
    const derived = intelligence.recommendations.slice(0, 3).map((recommendation) => ({
      id: recommendation.id,
      title: recommendation.title,
      summary: recommendation.description,
      focus: recommendation.category,
      audience: "Tu plan personal",
      updatedAt: generatedAt,
      href: `/dashboard/recommendations?resaltar=${recommendation.id}`,
    }))

    return derived.length > 0 ? derived : personalBudgetFallback.narratives
  }, [intelligence.forecastSummary?.generatedAt, intelligence.recommendations])

  const versionHistory = useMemo(() => {
    const items = goals?.goals ?? []

    const derived = items.slice(0, 3).map((goal) => {
      const status: VersionStatus = goal.status === "COMPLETED"
        ? "published"
        : goal.metrics.pace === "off_track"
          ? "draft"
          : "scheduled"

      return {
        id: goal.id,
        status,
        date: goal.metrics.lastRecordedAt ?? goal.targetDate ?? new Date().toISOString(),
        title: goal.name,
        description: goal.description,
      }
    })

    return derived.length > 0 ? derived : personalBudgetFallback.versionHistory
  }, [goals?.goals])

  const followUpActions = useMemo(() => {
    const actions = intelligence.recommendations.slice(0, 2).map((recommendation) => ({
      id: recommendation.id,
      title: recommendation.title,
      description: recommendation.explanation,
      href: `/dashboard/recommendations?categoria=${encodeURIComponent(recommendation.category)}`,
      label: "Revisar sugerencia",
    }))

    if (actions.length < 2 && goals?.goals?.length) {
      const firstGoal = goals.goals[0]
      actions.push({
        id: `${firstGoal.id}-habit`,
        title: "Refuerza tu hábito de ahorro",
        description: `Agrega un recordatorio semanal para avanzar en ${firstGoal.name}.`,
        href: "/dashboard/goals",
        label: "Ver metas",
      })
    }

    return actions.length > 0 ? actions : personalBudgetFallback.followUpActions
  }, [goals?.goals, intelligence.recommendations])

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Insights del dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Explora tus hallazgos priorizados, narrativas listas para personalizar y el historial de ajustes de tu presupuesto personal.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {headerActions.map((action) => {
            const Icon = headerIconMap[action.icon]
            return (
              <Button
                key={action.id}
                asChild
                size="sm"
                variant={action.variant}
                className="inline-flex items-center gap-1"
              >
                <Link href={action.href}>
                  <Icon className="h-4 w-4" />
                  {action.label}
                </Link>
              </Button>
            )
          })}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Hallazgos priorizados</CardTitle>
            <CardDescription>
              Priorizamos automáticamente tus oportunidades y alertas para cuidar tu presupuesto.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {priorities.map((insight) => (
              <div
                key={insight.id}
                className="flex flex-col gap-4 rounded-lg border border-dashed p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={priorityBadgeVariants[insight.priority]}>
                      Prioridad {insight.priority}
                    </Badge>
                    <Badge variant="outline">{insight.impact}</Badge>
                  </div>
                  <h3 className="text-base font-semibold text-foreground">{insight.title}</h3>
                  <p className="text-sm text-muted-foreground">{insight.summary}</p>
                </div>
                <div className="flex flex-col gap-2 sm:items-end sm:text-right">
                  <p className="text-sm text-muted-foreground">{insight.helper}</p>
                  <Button asChild size="sm" variant="outline">
                    <Link href={insight.actionHref} className="inline-flex items-center gap-1">
                      {insight.actionLabel}
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Highlights rápidos</CardTitle>
            <CardDescription>
              Señales clave para priorizar tus decisiones diarias.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {highlights.map((highlight) => {
              const Icon = highlightIconMap[highlight.icon]

              return (
                <div key={highlight.id} className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-start gap-3">
                    <span className="rounded-full bg-background p-2 shadow-sm">
                      <Icon className="h-4 w-4 text-primary" />
                    </span>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-foreground">{highlight.title}</h3>
                        <Badge variant={highlight.badgeVariant}>{highlight.badgeLabel}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{highlight.description}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Narrativas generadas</CardTitle>
            <CardDescription>
              Storytelling financiero listo para que lo adaptes a tus metas personales.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {narratives.map((narrative) => (
              <div key={narrative.id} className="rounded-lg border border-border/60 bg-background p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-xs">
                    {narrative.audience}
                  </Badge>
                  <span>Actualizado {dateFormatter.format(new Date(narrative.updatedAt))}</span>
                  <span>Foco: {narrative.focus}</span>
                </div>
                <h3 className="mt-2 text-base font-semibold text-foreground">{narrative.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{narrative.summary}</p>
                <Button asChild size="sm" variant="outline" className="mt-3 inline-flex items-center gap-1">
                  <Link href={narrative.href}>
                    Abrir narrativa
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Versionado inteligente</CardTitle>
            <CardDescription>
              Sigue los hitos de tus ajustes y registra cómo evoluciona tu plan financiero.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="relative space-y-6 border-s border-border ps-6">
              {versionHistory.map((item) => (
                <li key={item.id} className="relative space-y-2">
                  <span
                    className={`absolute -start-[9px] mt-1.5 h-4 w-4 rounded-full border-2 ${versionStatusDotStyles[item.status]}`}
                    aria-hidden
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{versionStatusLabels[item.status]}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {dateFormatter.format(new Date(item.date))}
                    </span>
                  </div>
                  <p className="text-base font-semibold text-foreground">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </li>
              ))}
            </ol>
          </CardContent>
          <CardFooter>
            <Button asChild size="sm" variant="secondary" className="inline-flex items-center gap-1">
              <Link href="/dashboard/insights/versiones">
                Gestionar versiones
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

        <Card>
          <CardHeader>
            <CardTitle>Llamadas a la acción</CardTitle>
            <CardDescription>
              Prioriza tus próximos pasos para convertir estos insights en hábitos sostenibles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {followUpActions.map((action) => (
                <li key={action.id} className="flex flex-col gap-2 rounded-lg border border-dashed p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-base font-semibold text-foreground">{action.title}</p>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                </div>
                <Button asChild size="sm" variant="outline" className="inline-flex items-center gap-1">
                  <Link href={action.href}>
                    {action.label}
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
