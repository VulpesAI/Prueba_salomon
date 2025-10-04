import Link from "next/link"
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

import { goalDetailsMock, goalsMock } from "../mock-data"

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})

const timelineBadgeStyles = {
  completed: "bg-emerald-500 text-white",
  upcoming: "bg-primary text-primary-foreground",
  delayed: "bg-amber-500 text-white",
}

const timelineDotStyles = {
  completed: "bg-emerald-500 border-emerald-500/60",
  upcoming: "bg-primary border-primary/40",
  delayed: "bg-amber-500 border-amber-500/60",
}

const timelineLabels = {
  completed: "Completado",
  upcoming: "Próximo",
  delayed: "Requiere atención",
}

const paceCopy: Record<"adelantada" | "en ruta" | "requiere atención", string> = {
  adelantada: "Vas por delante del objetivo planeado, considera adelantar hitos claves.",
  "en ruta": "Mantienes un ritmo saludable para llegar a la fecha objetivo.",
  "requiere atención": "Incrementa aportes o reprograma compromisos para retomar el ritmo.",
}

type GoalDetailPageProps = {
  params: Promise<{ goalId: string }>
}

export default async function GoalDetailPage({
  params,
}: GoalDetailPageProps) {
  const { goalId: encodedGoalId } = await params
  const goalId = decodeURIComponent(encodedGoalId)

  const listGoal = goalsMock.find((goal) => goal.id === goalId)
  const detail =
    goalDetailsMock[goalId] ??
    (listGoal
      ? {
          id: listGoal.id,
          title: listGoal.title,
          description: listGoal.description,
          category: listGoal.category,
          currentAmount: listGoal.currentAmount,
          targetAmount: listGoal.targetAmount,
          dueDate: listGoal.dueDate,
          monthlyContribution: listGoal.monthlyContribution,
          pace: "en ruta" as const,
          nextContributionDate: listGoal.dueDate,
          metrics: [
            {
              label: "Progreso acumulado",
              value: `${Math.min(100, Math.round((listGoal.currentAmount / listGoal.targetAmount) * 100))}%`,
              helper: `${currencyFormatter.format(listGoal.currentAmount)} de ${currencyFormatter.format(listGoal.targetAmount)}`,
            },
            {
              label: "Aporte mensual",
              value: currencyFormatter.format(listGoal.monthlyContribution),
              helper: "Promedio últimos 3 meses",
            },
            {
              label: "Fecha objetivo",
              value: dateFormatter.format(new Date(listGoal.dueDate)),
            },
          ],
          timeline: [],
          insights: listGoal.recommendations,
        }
      : null)

  if (!detail) {
    return (
      <div className="space-y-4">
        <Link
          href="/goals"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Regresar a metas
        </Link>
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

  const progress = detail.targetAmount
    ? Math.min(100, Math.round((detail.currentAmount / detail.targetAmount) * 100))
    : 0

  return (
    <div className="space-y-8">
      <Link
        href="/goals"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Regresar al listado
      </Link>

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
              Fecha objetivo: {dateFormatter.format(new Date(detail.dueDate))}
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
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
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
                    {currencyFormatter.format(detail.monthlyContribution)}
                  </dd>
                </div>
              </dl>
              <div className="rounded-lg bg-muted/60 p-4 text-sm">
                <p className="font-medium text-foreground">Próxima contribución</p>
                <p className="mt-1 text-foreground">
                  {dateFormatter.format(new Date(detail.nextContributionDate))}
                </p>
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
                          {dateFormatter.format(new Date(item.date))}
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
