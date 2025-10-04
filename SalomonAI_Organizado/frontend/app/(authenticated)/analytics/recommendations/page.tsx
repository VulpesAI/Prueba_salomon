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
import { useAnalyticsRecommendations } from "@/hooks/analytics/use-analytics-recommendations"
import { cn } from "@/lib/utils"
import { ArrowUpRight, Beaker, MessagesSquare, Route, Target } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts"

const campaignChartConfig = {
  conversion: {
    label: "Conversión",
    theme: {
      light: "hsl(158 65% 45%)",
      dark: "hsl(158 65% 65%)",
    },
  },
  uplift: {
    label: "Uplift",
    theme: {
      light: "hsl(27 96% 55%)",
      dark: "hsl(27 96% 70%)",
    },
  },
} satisfies ChartConfig

const formatPercentage = (value: number) => `${Math.round(value * 100)}%`

export default function AnalyticsRecommendationsPage() {
  const { campaigns, experiments, feedback, quickActions } =
    useAnalyticsRecommendations()

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Recomendaciones avanzadas
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestiona motores, experimentos y feedback para optimizar tus
            recomendaciones financieras con base en datos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="secondary">
            <Link href="/analytics/forecasts">
              Revisar pronósticos
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

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Rendimiento de campañas
            </CardTitle>
            <CardDescription>
              Conversión y uplift de las campañas activas versus el periodo
              anterior.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={campaignChartConfig} className="h-[320px] w-full">
              <BarChart data={campaigns}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  tickFormatter={formatPercentage}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={formatPercentage}
                  tickLine={false}
                  axisLine={false}
                />
                <Legend />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => [
                        formatPercentage(Number(value)),
                        campaignChartConfig[name as keyof typeof campaignChartConfig]?.label ??
                          name,
                      ]}
                    />
                  }
                />
                <Bar
                  yAxisId="left"
                  dataKey="conversion"
                  fill="var(--color-conversion)"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  yAxisId="right"
                  dataKey="uplift"
                  fill="var(--color-uplift)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
            <p className="mt-4 text-sm text-muted-foreground">
              Conversiones y uplifts normalizados contra la última ventana de 30
              días. Ajusta presupuesto desde el módulo de categorías si requieres
              profundizar.
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Beaker className="h-5 w-5 text-indigo-500" />
              Experimentación
            </CardTitle>
            <CardDescription>
              Pruebas activas y su impacto preliminar en métricas clave.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Experimento</TableHead>
                  <TableHead>Hipótesis</TableHead>
                  <TableHead className="text-right">Lift</TableHead>
                  <TableHead className="text-right">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {experiments.map((experiment) => (
                  <TableRow key={experiment.id}>
                    <TableCell className="font-medium">{experiment.name}</TableCell>
                    <TableCell className="max-w-xs text-sm text-muted-foreground">
                      {experiment.hypothesis}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-medium",
                      experiment.lift >= 0 ? "text-emerald-600" : "text-red-600"
                    )}>
                      {experiment.lift >= 0 ? "+" : "-"}
                      {formatPercentage(Math.abs(experiment.lift))}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        className={cn(
                          experiment.status === "En curso"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200"
                            : experiment.status === "Completado"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200"
                        )}
                      >
                        {experiment.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="flex flex-col lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessagesSquare className="h-5 w-5 text-rose-500" />
              Feedback de usuarios
            </CardTitle>
            <CardDescription>
              Captura percepciones clave para mejorar los motores de recomendación.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            {feedback.map((item) => (
              <div key={item.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-semibold leading-tight">{item.source}</h3>
                    <p className="text-sm text-muted-foreground">{item.excerpt}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        item.sentiment === "Positivo"
                          ? "border-emerald-500 text-emerald-600 dark:border-emerald-500/60 dark:text-emerald-200"
                          : item.sentiment === "Neutral"
                          ? "border-muted-foreground/40 text-muted-foreground"
                          : "border-red-500 text-red-600 dark:border-red-500/60 dark:text-red-200"
                      )}
                    >
                      {item.sentiment}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {item.volume} registros · {item.lastUpdate}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Itera campañas con base en la retroalimentación más reciente.
            </p>
            <Button asChild size="sm" variant="secondary">
              <Link href="/notifications">
                Enviar actualización
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-5 w-5 text-purple-500" />
              Acciones inmediatas
            </CardTitle>
            <CardDescription>
              Despliega módulos complementarios para cerrar el ciclo de
              recomendaciones.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {quickActions.map((action) => (
              <div key={action.id} className="rounded-lg border p-4">
                <h3 className="font-semibold">{action.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {action.description}
                </p>
                <Button asChild className="mt-3" size="sm" variant="outline">
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
    </div>
  )
}
