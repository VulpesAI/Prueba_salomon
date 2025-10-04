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
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAnalyticsCategories } from "@/hooks/analytics/use-analytics-categories"
import { cn } from "@/lib/utils"
import {
  ArrowUpRight,
  BarChart3,
  Flame,
  Layers,
  Send,
  Settings,
} from "lucide-react"
import { CartesianGrid, Cell, Scatter, ScatterChart, XAxis, YAxis, ZAxis } from "recharts"

const heatmapChartConfig = {
  intensity: {
    label: "Índice de impacto",
    theme: {
      light: "hsl(27 96% 61%)",
      dark: "hsl(27 96% 71%)",
    },
  },
} satisfies ChartConfig

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value)

const formatPercentage = (value: number) =>
  `${(value * 100).toFixed(0)}%`

export default function AnalyticsCategoriesPage() {
  const { heatmap, aggregates, drilldowns, adjustments, actions } =
    useAnalyticsCategories()

  const minValue = Math.min(...heatmap.points.map((point) => point.value))
  const maxValue = Math.max(...heatmap.points.map((point) => point.value))

  const colorScale = (value: number) => {
    const ratio =
      maxValue === minValue ? 0.5 : (value - minValue) / (maxValue - minValue)
    const hue = 200 - ratio * 140
    return `hsl(${hue}, 85%, 55%)`
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Analítica por categorías
          </h1>
          <p className="text-sm text-muted-foreground">
            Explora cómo se comportan tus categorías financieras, identifica
            focos de gasto y activa acciones inteligentes desde este panel.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="secondary">
            <Link href="/analytics/insights">
              Narrativas recientes
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/analytics/recommendations">
              Ir a recomendaciones
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                Mapa de calor de impacto
              </CardTitle>
              <CardDescription>
                Cruza categorías con periodos para visualizar concentraciones de
                gasto y oportunidades de ajuste.
              </CardDescription>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/alerts">
                Configurar alertas
                <Settings className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ChartContainer config={heatmapChartConfig} className="h-[360px] w-full">
              <ScatterChart data={heatmap.points}>
                <CartesianGrid strokeDasharray="4 4" />
                <XAxis dataKey="month" type="category" axisLine={false} tickLine={false} />
                <YAxis dataKey="category" type="category" axisLine={false} tickLine={false} width={120} />
                <ZAxis dataKey="value" range={[60, 320]} />
                <ChartTooltip
                  cursor={{ strokeDasharray: "4 4" }}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => `Mes: ${value}`}
                      formatter={(value) => [
                        `${Number(value).toFixed(0)} puntos`,
                        "Índice de impacto",
                      ]}
                    />
                  }
                />
                <Scatter data={heatmap.points} name="impacto" shape="circle">
                  {heatmap.points.map((point) => (
                    <Cell
                      key={`${point.category}-${point.month}`}
                      fill={colorScale(point.value)}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ChartContainer>
            <p className="mt-4 text-sm text-muted-foreground">
              Intensidad calculada en base a variación mensual ponderada por
              peso presupuestario. Valores altos indican focos prioritarios de
              monitoreo.
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Participación por categoría
            </CardTitle>
            <CardDescription>
              Comparativo mensual de presupuesto ejecutado y tendencia versus el
              periodo anterior.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Participación</TableHead>
                  <TableHead className="text-right">Tendencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aggregates.map((row) => (
                  <TableRow key={row.category}>
                    <TableCell className="font-medium">{row.category}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.total)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPercentage(row.share)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={row.status === "up" ? "default" : "secondary"}
                        className={cn(
                          "inline-flex items-center gap-1",
                          row.status === "up"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                            : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200"
                        )}
                      >
                        {row.status === "up" ? "↑" : "↓"} {formatPercentage(Math.abs(row.change))}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-500" />
                Drill-down de subcategorías
              </CardTitle>
              <CardDescription>
                Analiza las transacciones con mayor contribución para priorizar
                acciones tácticas.
              </CardDescription>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/transactions">
                Revisar movimientos
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px] pr-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subcategoría</TableHead>
                    <TableHead>Padre</TableHead>
                    <TableHead className="text-right">Transacciones</TableHead>
                    <TableHead className="text-right">Ticket promedio</TableHead>
                    <TableHead className="text-right">Cambio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drilldowns.map((item) => (
                    <TableRow key={item.subcategory}>
                      <TableCell className="font-medium">
                        {item.subcategory}
                      </TableCell>
                      <TableCell>{item.parent}</TableCell>
                      <TableCell className="text-right">
                        {item.transactions.toLocaleString("es-CL")}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.averageTicket)}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-medium",
                        item.change >= 0 ? "text-emerald-600" : "text-red-600"
                      )}>
                        {item.change >= 0 ? "+" : "-"}
                        {formatPercentage(Math.abs(item.change))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="flex flex-col lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-purple-500" />
              Acciones sugeridas
            </CardTitle>
            <CardDescription>
              Ajustes automáticos priorizados según impacto y esfuerzo estimado.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            {adjustments.map((adjustment) => (
              <div key={adjustment.id} className="rounded-lg border border-dashed p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold leading-tight">
                      {adjustment.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {adjustment.description}
                    </p>
                  </div>
                  <Badge variant="outline" className="whitespace-nowrap">
                    {adjustment.impact}
                  </Badge>
                </div>
                <Button asChild className="mt-3" size="sm">
                  <Link href={adjustment.href}>{adjustment.actionLabel}</Link>
                </Button>
              </div>
            ))}
          </CardContent>
          <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Coordina estas acciones con objetivos financieros para medir
              resultados sostenibles.
            </p>
            <Button asChild size="sm" variant="secondary">
              <Link href="/goals">
                Vincular con objetivos
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acciones inmediatas</CardTitle>
          <CardDescription>
            Navega rápidamente hacia los módulos que potencian tu estrategia de
            inteligencia financiera.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {actions.map((action) => (
            <div
              key={action.id}
              className="flex flex-col justify-between rounded-lg border p-4"
            >
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
