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

import {
  goalsMock,
  goalDetailsMock,
  suggestedGoalsMock,
} from "./mock-data"

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

export default function GoalsPage() {
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
          {goalsMock.map((goal) => {
            const detail = goalDetailsMock[goal.id]
            const progress = Math.min(
              100,
              Math.round((goal.currentAmount / goal.targetAmount) * 100),
            )

            return (
              <Card key={goal.id} className="flex flex-col">
                <CardHeader className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">{goal.title}</CardTitle>
                      <CardDescription>{goal.category}</CardDescription>
                    </div>
                    <Link
                      href={`/goals/${goal.id}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      Detalle
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {goal.description}
                  </div>
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
                        {currencyFormatter.format(goal.currentAmount)}
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
                      <dd>{currencyFormatter.format(goal.monthlyContribution)}</dd>
                    </div>
                    <div className="space-y-1 text-right">
                      <dt className="text-muted-foreground">Fecha objetivo</dt>
                      <dd>{dateFormatter.format(new Date(goal.dueDate))}</dd>
                    </div>
                  </dl>
                  <div className="rounded-lg bg-muted/60 p-3 text-sm">
                    <p className="font-medium text-foreground">Recomendaciones</p>
                    <ul className="mt-2 space-y-2 text-muted-foreground">
                      {goal.recommendations.map((recommendation) => (
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
                    <span>
                      Próximo hito: {detail ? dateFormatter.format(new Date(detail.nextContributionDate)) : "Sin definir"}
                    </span>
                  </div>
                  <p>{goal.progressTrend}</p>
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
          {suggestedGoalsMock.map((suggested) => (
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
                  <Link href={`/goals/crear?referer=${suggested.id}`} className="inline-flex items-center justify-center gap-1">
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
