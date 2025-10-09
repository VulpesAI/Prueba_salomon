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
import { useAnalyticsInsights } from "@/hooks/analytics/use-analytics-insights"
import { cn } from "@/lib/utils"
import {
  ArrowUpRight,
  BookOpen,
  Columns,
  MessageSquare,
  Radar,
  Sparkles,
} from "lucide-react"
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts"

const comparisonChartConfig = {
  retention: {
    label: "Variación del gasto",
    theme: {
      light: "hsl(158 65% 45%)",
      dark: "hsl(158 65% 65%)",
    },
  },
  growth: {
    label: "Avance de ahorro",
    theme: {
      light: "hsl(220 90% 45%)",
      dark: "hsl(220 90% 70%)",
    },
  },
} satisfies ChartConfig

const formatPercentage = (value: number) =>
  `${value > 0 ? "+" : ""}${Math.round(value * 100)}%`

export default function AnalyticsInsightsPage() {
  const { narratives, comparisons, executiveMetrics, actions, quickActions } =
    useAnalyticsInsights()

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Insights de tus finanzas
          </h1>
          <p className="text-sm text-muted-foreground">
            Convierte tus movimientos en historias accionables para administrar
            gastos, ajustar tu presupuesto y avanzar hacia tus metas de ahorro.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="secondary">
            <Link href="/analytics/categories">
              Revisar transacciones relacionadas
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/assistant">
              Generar historia personalizada
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Historias sobre tu dinero
            </CardTitle>
            <CardDescription>
              Descubre eventos relevantes en tus gastos y ahorros con contexto
              listo para compartir.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {narratives.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aún no hay insights; conecta tus cuentas o carga datos de
                ejemplo.
              </p>
            ) : (
              narratives.map((narrative) => (
                <div key={narrative.id} className="rounded-lg border border-dashed p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold">{narrative.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {narrative.summary}
                      </p>
                    </div>
                    <Badge variant="outline" className="whitespace-nowrap">
                      {narrative.highlight}
                    </Badge>
                  </div>
                  <Button asChild className="mt-3" size="sm" variant="outline">
                    <Link href={narrative.href}>
                      Revisar detalle relacionado
                      <ArrowUpRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Columns className="h-5 w-5 text-[#3B82F6]" />
              Comparativo de hábitos
            </CardTitle>
            <CardDescription>
              Compara cómo cambian tus gastos y avances de ahorro entre
              categorías relevantes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {comparisons.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aún no hay insights; conecta tus cuentas o carga datos de
                ejemplo.
              </p>
            ) : (
              <>
                <ChartContainer config={comparisonChartConfig} className="h-[320px] w-full">
                  <BarChart data={comparisons}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="cohort" tickLine={false} axisLine={false} />
                    <YAxis
                      yAxisId="left"
                      orientation="left"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={formatPercentage}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
                    />
                    <Legend />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) =>
                            name === "clv"
                              ? [
                                  new Intl.NumberFormat("es-CL", {
                                    style: "currency",
                                    currency: "CLP",
                                    maximumFractionDigits: 0,
                                  }).format(Number(value)),
                                  "Gasto promedio mensual",
                                ]
                              : [
                                  formatPercentage(Number(value)),
                                  comparisonChartConfig[name as keyof typeof comparisonChartConfig]?.label ?? name,
                                ]
                          }
                        />
                      }
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="retention"
                      fill="var(--color-retention)"
                      radius={[6, 6, 0, 0]}
                      name="Variación del gasto"
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="growth"
                      fill="var(--color-growth)"
                      radius={[6, 6, 0, 0]}
                      name="Avance de ahorro"
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="clv"
                      fill="hsl(27 96% 61%)"
                      radius={[6, 6, 0, 0]}
                      name="Gasto promedio mensual"
                    />
                  </BarChart>
                </ChartContainer>
                <p className="mt-4 text-sm text-muted-foreground">
                  Los montos están expresados en pesos chilenos e incluyen tus
                  gastos promedio en cada categoría.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radar className="h-5 w-5 text-[#06B6D4]" />
              Resumen de tu situación
            </CardTitle>
            <CardDescription>
              Indicadores clave para saber cómo vas con tu presupuesto y tus
              metas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {executiveMetrics.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aún no hay insights; conecta tus cuentas o carga datos de
                  ejemplo.
                </p>
              ) : (
                executiveMetrics.map((metric) => (
                  <div
                    key={metric.title}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm text-muted-foreground">{metric.title}</p>
                      <p className="text-lg font-semibold">{metric.value}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        metric.tone === "positive"
                          ? "border-[color:color-mix(in_srgb,var(--success)_55%,transparent)] text-app-success"
                          : metric.tone === "negative"
                          ? "border-[color:color-mix(in_srgb,var(--danger)_55%,transparent)] text-app-danger"
                          : "border-muted-foreground/40 text-muted-foreground",
                      )}
                    >
                      {metric.delta}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild size="sm" variant="outline">
              <Link href="/alerts">
                Ajustar presupuesto
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-brand" />
              Recomendaciones para ti
            </CardTitle>
            <CardDescription>
              Sigue estas acciones para optimizar tus gastos y alcanzar tus
              metas personales.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Acción</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Enlace</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                      Aún no hay insights; conecta tus cuentas o carga datos de ejemplo.
                    </TableCell>
                  </TableRow>
                ) : (
                  actions.map((action) => (
                    <TableRow key={action.id}>
                      <TableCell className="font-medium">{action.label}</TableCell>
                      <TableCell>{action.description}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="secondary">
                          <Link href={action.href}>
                            Abrir
                            <ArrowUpRight className="ml-1 h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Atajos para actuar hoy
          </CardTitle>
          <CardDescription>
            Complementa tus insights con herramientas que te ayudan a tomar
            decisiones rápidas.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {quickActions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay insights; conecta tus cuentas o carga datos de ejemplo.
            </p>
          ) : (
            quickActions.map((action) => (
              <div key={action.id} className="flex flex-col justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <h3 className="font-semibold">{action.label}</h3>
                  <p className="text-sm text-muted-foreground">
                    {action.description}
                  </p>
                </div>
                <Button asChild className="mt-4" size="sm" variant="outline">
                  <Link href={action.href}>
                    Abrir
                    <ArrowUpRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
