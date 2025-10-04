import Link from "next/link"

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
import { dashboardInsightsMock } from "./mock-data"
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

const headerIconMap = {
  radar: Radar,
  download: Download,
  share: Share2,
} as const

const highlightIconMap = {
  sparkles: Sparkles,
  trendingUp: TrendingUp,
  shield: ShieldCheck,
} as const

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

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "short",
})

export default function DashboardInsightsPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Insights del dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Explora hallazgos priorizados, narrativas listas para compartir y el historial de versiones de tu panel financiero.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {dashboardInsightsMock.headerActions.map((action) => {
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
              Priorización automática de oportunidades y riesgos detectados por la plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboardInsightsMock.priorities.map((insight) => (
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
              Señales clave para priorizar conversaciones con tus equipos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboardInsightsMock.highlights.map((highlight) => {
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
              Storytelling financiero listo para personalizar y compartir con stakeholders.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboardInsightsMock.narratives.map((narrative) => (
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
              Sigue los hitos de publicación y los cambios clave entre versiones.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="relative space-y-6 border-s border-border ps-6">
              {dashboardInsightsMock.versionHistory.map((item) => (
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
            Prioriza próximos pasos para convertir insights en resultados tangibles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {dashboardInsightsMock.followUpActions.map((action) => (
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
