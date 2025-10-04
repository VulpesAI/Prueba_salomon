"use client"

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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAnalyticsForecasts } from "@/hooks/analytics/use-analytics-forecasts"
import { cn } from "@/lib/utils"
import {
  Activity,
  AlarmClockPlus,
  ArrowUpRight,
  BarChart4,
  LineChart as LineChartIcon,
  Radio,
} from "lucide-react"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"

const chartConfig = {
  actual: {
    label: "Real",
    theme: {
      light: "hsl(220 80% 45%)",
      dark: "hsl(220 80% 70%)",
    },
  },
  forecast: {
    label: "Pronóstico",
    theme: {
      light: "hsl(158 65% 45%)",
      dark: "hsl(158 65% 65%)",
    },
  },
  upper: {
    label: "Límite superior",
    color: "hsl(27 96% 61%)",
  },
  lower: {
    label: "Límite inferior",
    color: "hsl(27 96% 61%)",
  },
} satisfies ChartConfig

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value)

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("es-CL", { month: "short" })

export default function AnalyticsForecastsPage() {
  const { series, models, schedules, insights, actions } =
    useAnalyticsForecasts()

  const latestActual = series
    .filter((point) => typeof point.actual === "number")
    .at(-1)?.actual

  const nextMonths = series
    .filter((point) => point.actual == null)
    .map((point) => formatDate(point.date))
    .join(", ")

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Pronósticos financieros
          </h1>
          <p className="text-sm text-muted-foreground">
            Controla tus modelos predictivos, intervalos de confianza y agenda de
            ejecución para anticiparte a la variabilidad del negocio.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="secondary">
            <Link href="/analytics/categories">
              Ver mapa de calor
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/alerts">
              Configurar alertas
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <LineChartIcon className="h-5 w-5 text-primary" />
                Evolución proyectada
              </CardTitle>
              <CardDescription>
                Serie histórica y horizonte futuro con bandas de confianza
                dinámicas.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              Último real: {latestActual ? formatCurrency(latestActual) : "N/D"}
            </Badge>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[360px] w-full">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="4 4" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(value) =>
                    new Intl.NumberFormat("es-CL", { notation: "compact" }).format(
                      Number(value)
                    )
                  }
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) =>
                        new Date(value as string).toLocaleDateString("es-CL", {
                          month: "short",
                          year: "numeric",
                        })
                      }
                      formatter={(value, name) => [
                        formatCurrency(Number(value)),
                        chartConfig[name as keyof typeof chartConfig]?.label ??
                          name,
                      ]}
                    />
                  }
                />
                <Legend />
                <ReferenceLine y={series[series.length - 1]?.forecast} strokeDasharray="4 4" stroke="var(--color-forecast)" />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="var(--color-actual)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="var(--color-forecast)"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="upper"
                  stroke="var(--color-upper)"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="lower"
                  stroke="var(--color-lower)"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
            <p className="mt-4 text-sm text-muted-foreground">
              Los intervalos se generan con un 90% de confianza. Próximos meses
              modelados: {nextMonths || "N/D"}.
            </p>
          </CardContent>
        </Card>

        <Card className="space-y-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-500" />
              Insights del modelo
            </CardTitle>
            <CardDescription>
              Hallazgos accionables detectados por el motor de analítica.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {insights.map((insight) => (
              <div key={insight.id} className="rounded-lg border border-dashed p-4">
                <h3 className="font-semibold">{insight.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {insight.summary}
                </p>
                <p className="mt-3 text-sm font-medium text-primary">
                  {insight.recommendation}
                </p>
              </div>
            ))}
          </CardContent>
          <CardFooter className="justify-end">
            <Button asChild size="sm" variant="outline">
              <Link href="/analytics/insights">
                Compartir narrativa
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart4 className="h-5 w-5 text-indigo-500" />
              Métricas de modelos
            </CardTitle>
            <CardDescription>
              Evalúa el desempeño y estado operativo de tus modelos de forecast.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Horizonte</TableHead>
                  <TableHead className="text-right">MAPE</TableHead>
                  <TableHead className="text-right">Cobertura</TableHead>
                  <TableHead className="text-right">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((model) => (
                  <TableRow key={model.model}>
                    <TableCell className="font-medium">{model.model}</TableCell>
                    <TableCell>{model.horizon}</TableCell>
                    <TableCell className="text-right">
                      {model.mape.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {model.coverage}%
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        className={cn(
                          model.status === "Activo"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                            : model.status === "Entrenando"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200"
                        )}
                      >
                        {model.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="flex flex-col lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlarmClockPlus className="h-5 w-5 text-rose-500" />
              Programación de corridas
            </CardTitle>
            <CardDescription>
              Controla cuándo se ejecutan y a quién se notifican los escenarios
              clave.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            {schedules.map((schedule) => (
              <div key={schedule.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold leading-tight">
                      {schedule.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {schedule.cadence}
                    </p>
                  </div>
                  <Badge variant="outline">{schedule.nextRun}</Badge>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Entrega: {schedule.channel}
                </p>
              </div>
            ))}
          </CardContent>
          <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Sincroniza estos escenarios con automatizaciones y campañas.
            </p>
            <Button asChild size="sm" variant="secondary">
              <Link href="/analytics/recommendations">
                Vincular campañas
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary" />
            Acciones inmediatas
          </CardTitle>
          <CardDescription>
            Activa flujos relacionados con tus pronósticos para cerrar el ciclo
            de inteligencia.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {actions.map((action) => (
            <div key={action.id} className="flex flex-col justify-between rounded-lg border p-4">
              <div className="space-y-1">
                <h3 className="font-semibold">{action.label}</h3>
                <p className="text-sm text-muted-foreground">
                  {action.description}
                </p>
              </div>
              <Button asChild className="mt-4" size="sm" variant="outline">
                <Link href={action.href}>
                  Abrir módulo
                  <ArrowUpRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
