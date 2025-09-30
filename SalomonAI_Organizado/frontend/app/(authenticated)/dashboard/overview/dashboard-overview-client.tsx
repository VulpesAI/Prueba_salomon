"use client"

import Link from "next/link"
import { useCallback, useMemo, useState } from "react"

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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { useDashboardIntelligence } from "@/hooks/dashboard/use-dashboard-intelligence"
import type {
  NotificationHistoryItem,
  UserNotificationPreferences,
} from "@/hooks/dashboard/use-dashboard-notifications"
import { useDashboardNotifications } from "@/hooks/dashboard/use-dashboard-notifications"
import { useDashboardOverview } from "@/hooks/dashboard/use-dashboard-overview"
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BellRing,
  CheckCircle,
  ChevronRight,
  Flame,
  RefreshCcw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react"
import { Bar, BarChart, CartesianGrid, Cell, XAxis } from "recharts"

const formatCurrency = (value?: number | null) => {
  const amount = typeof value === "number" ? value : 0
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount)
}

const formatPercentage = (value: number) => `${Math.round(value * 100)}%`

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("es-CL", { day: "numeric", month: "short" })

type NotificationPanelProps = {
  isLoading: boolean
  notifications: NotificationHistoryItem[]
  preferences: UserNotificationPreferences | null
  mode?: "compact" | "detailed"
}

export default function DashboardOverviewClient() {
  const overview = useDashboardOverview()
  const intelligence = useDashboardIntelligence()
  const notifications = useDashboardNotifications()

  const { refresh: refreshOverview } = overview
  const { refresh: refreshIntelligence } = intelligence
  const { refresh: refreshNotifications } = notifications

  const [isDetailed, setIsDetailed] = useState(false)

  const totalsCards = useMemo(
    () => {
      const totals = overview.totals

      return [
        {
          title: "Balance actual",
          description: "Incluye cuentas y tarjetas vinculadas",
          value: formatCurrency(totals?.balance),
          trend: {
            icon: Wallet,
            helper: "Disponible",
          },
        },
        {
          title: "Ingresos del mes",
          description: "Últimos depósitos registrados",
          value: formatCurrency(totals?.income),
          trend: {
            icon: TrendingUp,
            helper: "+8.2% vs. mes anterior",
          },
        },
        {
          title: "Gastos del mes",
          description: "Pagos categorizados",
          value: formatCurrency(totals?.expenses),
          trend: {
            icon: TrendingDown,
            helper: "-4.1% vs. mes anterior",
          },
        },
        {
          title: "Ahorro estimado",
          description: "Proyección de excedente",
          value: formatCurrency(totals?.savings ?? 0),
          trend: {
            icon: Sparkles,
            helper: "Objetivo mensual 75%",
          },
        },
      ]
    },
    [overview.totals]
  )

  const institutionsCount = useMemo(() => {
    const institutions = overview.accounts
      .map((account) => account.institution)
      .filter((institution): institution is string => Boolean(institution))
    return new Set(institutions).size
  }, [overview.accounts])

  const quickSummaryCards = useMemo(
    () => {
      const latestTransaction = overview.recentTransactions[0]
      const alertsCount = intelligence.predictiveAlerts.length
      const notificationsCount = notifications.notifications.length
      const totalAlerts = alertsCount + notificationsCount

      return [
        {
          title: "Cuentas activas",
          value: `${overview.accounts.length}`,
          helper:
            overview.accounts.length > 0
              ? `En ${institutionsCount} instituciones`
              : "Conecta tus cuentas desde el módulo de cuentas",
          icon: Wallet,
        },
        {
          title: "Actividad reciente",
          value:
            latestTransaction?.amount != null
              ? formatCurrency(Math.abs(latestTransaction.amount))
              : "Sin movimientos",
          helper:
            latestTransaction != null
              ? `${latestTransaction.description} · ${formatDate(latestTransaction.date)}`
              : "Registra tu primer movimiento para comenzar",
          icon: Activity,
          accent:
            latestTransaction?.amount != null
              ? latestTransaction.amount >= 0
                ? "text-emerald-500"
                : "text-destructive"
              : undefined,
          trendIcon:
            latestTransaction?.amount != null
              ? latestTransaction.amount >= 0
                ? ArrowUpRight
                : ArrowDownRight
              : undefined,
        },
        {
          title: "Alertas y avisos",
          value: `${totalAlerts}`,
          helper:
            totalAlerts > 0
              ? `${alertsCount} alertas · ${notificationsCount} notificaciones`
              : "Sin novedades críticas",
          icon: BellRing,
          accent: totalAlerts > 0 ? "text-amber-600" : undefined,
        },
      ]
    },
    [
      institutionsCount,
      intelligence.predictiveAlerts,
      notifications.notifications,
      overview.accounts.length,
      overview.recentTransactions,
    ]
  )

  const categoryBreakdown = useMemo(
    () => overview.categoryBreakdown.slice(0, 6),
    [overview.categoryBreakdown]
  )

  const categoryChartData = useMemo(
    () =>
      categoryBreakdown.map((category, index) => ({
        name: category.name,
        amount: category.amount,
        percentage: category.percentage,
        fill: category.color ?? `hsl(var(--chart-${(index % 5) + 1}))`,
      })),
    [categoryBreakdown]
  )

  const categoryChartConfig = useMemo<ChartConfig>(
    () => ({
      amount: {
        label: "Monto",
        color: "hsl(var(--primary))",
      },
    }),
    []
  )

  const topAccounts = useMemo(
    () => overview.accounts.slice(0, 5),
    [overview.accounts]
  )

  const recentTransactions = useMemo(
    () => overview.recentTransactions.slice(0, 5),
    [overview.recentTransactions]
  )

  const displayedAlerts = useMemo(
    () => intelligence.predictiveAlerts.slice(0, 3),
    [intelligence.predictiveAlerts]
  )

  const displayedRecommendations = useMemo(
    () => intelligence.recommendations.slice(0, 3),
    [intelligence.recommendations]
  )

  const displayedInsights = useMemo(
    () => intelligence.insights.slice(0, 4),
    [intelligence.insights]
  )

  const handleRefresh = useCallback(() => {
    void refreshOverview()
    void refreshIntelligence()
    void refreshNotifications()
  }, [refreshIntelligence, refreshNotifications, refreshOverview])

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 border-b border-border/60 pb-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Resumen general</h1>
          <p className="text-muted-foreground">
            Observa tu posición actual y profundiza solo cuando lo necesites.
          </p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 px-3 py-2 shadow-sm">
            <Switch
              id="dashboard-view-mode"
              checked={isDetailed}
              onCheckedChange={setIsDetailed}
            />
            <Label htmlFor="dashboard-view-mode" className="text-sm font-medium">
              Modo detallado
            </Label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={handleRefresh} className="gap-2">
              <RefreshCcw className="h-4 w-4" /> Actualizar datos
            </Button>
            <Button asChild className="gap-2">
              <Link href="/assistant">
                <Sparkles className="h-4 w-4" /> Preguntar al asistente
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {overview.isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <Card key={`overview-skeleton-${index}`} className="shadow-sm">
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-36" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-28" />
                  <Skeleton className="mt-2 h-3 w-32" />
                </CardContent>
              </Card>
            ))
          : totalsCards.map((card) => (
              <Card key={card.title} className="border border-border/70 bg-card/80 shadow-sm">
                <CardHeader className="space-y-1">
                  <CardDescription className="text-xs uppercase tracking-wide text-muted-foreground">
                    {card.description}
                  </CardDescription>
                  <CardTitle className="text-lg font-semibold">{card.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-semibold">{card.value}</div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <card.trend.icon className="h-4 w-4" />
                    <span>{card.trend.helper}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
      </section>

      <section className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {overview.isLoading
            ? Array.from({ length: 3 }).map((_, index) => (
                <Card key={`quick-skeleton-${index}`} className="shadow-sm">
                  <CardContent className="space-y-3 p-6">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-3 w-32" />
                  </CardContent>
                </Card>
              ))
            : quickSummaryCards.map((card) => {
                const Icon = card.icon
                const TrendIcon = card.trendIcon

                return (
                  <Card key={card.title} className="border border-border/70 bg-card/70 shadow-sm">
                    <CardContent className="flex items-start justify-between gap-4 p-6">
                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {card.title}
                        </p>
                        <p className={`text-2xl font-semibold ${card.accent ?? ""}`}>
                          {card.value}
                        </p>
                        {TrendIcon ? (
                          <p
                            className={`flex items-center gap-1 text-sm ${card.accent ?? "text-muted-foreground"}`}
                          >
                            <TrendIcon className="h-4 w-4" />
                            {card.helper}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">{card.helper}</p>
                        )}
                      </div>
                      <Icon className="h-6 w-6 text-muted-foreground" />
                    </CardContent>
                  </Card>
                )
              })}
        </div>

        {!isDetailed ? (
          <NotificationPanel
            mode="compact"
            isLoading={notifications.isLoading}
            notifications={notifications.notifications}
            preferences={notifications.preferences}
          />
        ) : null}
      </section>

      {overview.error ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              No pudimos recuperar el resumen financiero
            </CardTitle>
            <CardDescription>
              {overview.error} — intenta nuevamente o verifica la conexión con la API.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="destructive" onClick={handleRefresh}>
              Reintentar
            </Button>
          </CardFooter>
        </Card>
      ) : null}

      {isDetailed ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[7fr_5fr]">
          <div className="space-y-6">
            <Card className="border border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>Detalle operativo</CardTitle>
                <CardDescription>
                  Expande cada bloque para acceder a los datos operativos cuando los necesites.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <Accordion type="multiple" className="divide-y">
                  <AccordionItem value="accounts" className="border-0">
                    <AccordionTrigger className="px-6 text-left text-base font-medium">
                      <div className="flex flex-col gap-1 text-left">
                        <span>Cuentas conectadas</span>
                        <span className="text-xs text-muted-foreground">
                          {overview.accounts.length} cuentas · {institutionsCount} instituciones
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6">
                      {overview.isLoading ? (
                        <div className="space-y-2">
                          {Array.from({ length: 3 }).map((_, index) => (
                            <Skeleton key={`account-skeleton-${index}`} className="h-10 w-full" />
                          ))}
                        </div>
                      ) : topAccounts.length > 0 ? (
                        <div className="space-y-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Cuenta</TableHead>
                                <TableHead>Institución</TableHead>
                                <TableHead className="text-right">Saldo</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {topAccounts.map((account) => (
                                <TableRow key={account.id}>
                                  <TableCell className="font-medium">{account.name}</TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {account.institution ?? "Institución desconocida"}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold">
                                    {formatCurrency(account.balance)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          {overview.accounts.length > topAccounts.length ? (
                            <Button variant="link" asChild className="px-0">
                              <Link href="/accounts">Ver todas las cuentas</Link>
                            </Button>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Vincula tus cuentas bancarias para comenzar a analizar tus finanzas.
                        </p>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="transactions" className="border-0">
                    <AccordionTrigger className="px-6 text-left text-base font-medium">
                      <div className="flex flex-col gap-1 text-left">
                        <span>Transacciones recientes</span>
                        <span className="text-xs text-muted-foreground">
                          {recentTransactions.length} movimientos destacados
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6">
                      {overview.isLoading ? (
                        <div className="space-y-2">
                          {Array.from({ length: 4 }).map((_, index) => (
                            <Skeleton key={`transaction-skeleton-${index}`} className="h-10 w-full" />
                          ))}
                        </div>
                      ) : recentTransactions.length > 0 ? (
                        <div className="space-y-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Detalle</TableHead>
                                <TableHead>Categoría</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {recentTransactions.map((transaction) => (
                                <TableRow key={transaction.id}>
                                  <TableCell>
                                    <div className="space-y-1">
                                      <p className="font-medium">{transaction.description}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {formatDate(transaction.date)}
                                      </p>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {transaction.category ?? "Sin categoría"}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold">
                                    <span
                                      className={
                                        transaction.amount >= 0
                                          ? "text-emerald-500"
                                          : "text-destructive"
                                      }
                                    >
                                      {transaction.amount >= 0 ? "+" : "-"}
                                      {formatCurrency(Math.abs(transaction.amount))}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          {overview.recentTransactions.length > recentTransactions.length ? (
                            <Button variant="link" asChild className="px-0">
                              <Link href="/transactions">Ver todas las transacciones</Link>
                            </Button>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No registramos movimientos recientes. Sincroniza nuevas cuentas o descarga tu historial.
                        </p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            <Card className="border border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>Inteligencia financiera</CardTitle>
                <CardDescription>
                  Profundiza en distribución, pronósticos y recomendaciones cuando quieras.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="distribution" className="space-y-4">
                  <TabsList className="flex w-full flex-wrap justify-start gap-2 bg-muted/60 p-2">
                    <TabsTrigger value="distribution" className="px-3 py-1.5">
                      Distribución
                    </TabsTrigger>
                    <TabsTrigger value="alerts" className="px-3 py-1.5">
                      Alertas
                    </TabsTrigger>
                    <TabsTrigger value="forecast" className="px-3 py-1.5">
                      Pronóstico
                    </TabsTrigger>
                    <TabsTrigger value="recommendations" className="px-3 py-1.5">
                      Recomendaciones
                    </TabsTrigger>
                    <TabsTrigger value="insights" className="px-3 py-1.5">
                      Insights
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="distribution" className="space-y-4">
                    {overview.isLoading ? (
                      <Skeleton className="h-48 w-full" />
                    ) : categoryChartData.length > 0 ? (
                      <div className="space-y-4">
                        <ChartContainer
                          config={categoryChartConfig}
                          className="min-h-[240px] w-full"
                        >
                          <BarChart data={categoryChartData}>
                            <CartesianGrid vertical={false} strokeDasharray="4 4" />
                            <XAxis
                              dataKey="name"
                              tickLine={false}
                              axisLine={false}
                              tickMargin={12}
                            />
                            <ChartTooltip
                              content={
                                <ChartTooltipContent
                                  formatter={(value) => [
                                    formatCurrency(Number(value)),
                                    "Monto",
                                  ]}
                                  labelFormatter={(label) => label}
                                />
                              }
                            />
                            <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                              {categoryChartData.map((item) => (
                                <Cell key={item.name} fill={item.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ChartContainer>
                        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                          {categoryChartData.map((category) => (
                            <div
                              key={category.name}
                              className="flex items-center justify-between rounded-md border border-dashed border-border/60 px-3 py-2"
                            >
                              <span>{category.name}</span>
                              <span className="font-semibold">{category.percentage}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Cuando clasifiques transacciones verás la distribución por categoría en esta sección.
                      </p>
                    )}
                  </TabsContent>

                  <TabsContent value="alerts" className="space-y-4">
                    {intelligence.isLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 2 }).map((_, index) => (
                          <Skeleton key={`alert-skeleton-${index}`} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : displayedAlerts.length > 0 ? (
                      <div className="space-y-3">
                        {displayedAlerts.map((alert) => (
                          <div
                            key={alert.id}
                            className="rounded-lg border border-border/60 bg-card/60 p-4"
                          >
                            <div className="flex items-center justify-between text-sm font-medium">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                <span>{alert.message}</span>
                              </div>
                              <Badge variant="outline" className="capitalize">
                                {alert.severity}
                              </Badge>
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">
                              Proyección: {formatDate(alert.forecastDate)}
                            </p>
                          </div>
                        ))}
                        {intelligence.predictiveAlerts.length > displayedAlerts.length ? (
                          <p className="text-xs text-muted-foreground">
                            {`${intelligence.predictiveAlerts.length - displayedAlerts.length} alertas adicionales disponibles en el módulo de alertas.`}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No hay alertas pendientes. Mantén conectadas tus cuentas para recibir proyecciones tempranas.
                      </p>
                    )}
                  </TabsContent>

                  <TabsContent value="forecast" className="space-y-4">
                    {intelligence.isLoading ? (
                      <Skeleton className="h-48 w-full" />
                    ) : intelligence.forecastSummary ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-3">
                          <div>
                            <p className="text-sm font-semibold">
                              {intelligence.forecastSummary.modelType}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Generado {formatDate(intelligence.forecastSummary.generatedAt ?? new Date().toISOString())}
                            </p>
                          </div>
                          <Badge variant="secondary" className="capitalize">
                            {intelligence.forecastSummary.trend.direction === "upward"
                              ? "Tendencia al alza"
                              : intelligence.forecastSummary.trend.direction === "downward"
                                ? "Tendencia a la baja"
                                : "Estable"}
                          </Badge>
                        </div>
                        <div className="rounded-lg border border-border/60 p-4">
                          <p className="text-xs text-muted-foreground">Cambio estimado</p>
                          <p className="text-2xl font-semibold">
                            {formatCurrency(intelligence.forecastSummary.trend.change)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatPercentage(intelligence.forecastSummary.trend.changePercentage)} respecto al promedio histórico
                          </p>
                        </div>
                        <div className="space-y-2">
                          {intelligence.forecastSummary.forecasts.slice(0, 6).map((point) => (
                            <div
                              key={point.date}
                              className="flex items-center justify-between text-xs"
                            >
                              <span>{formatDate(point.date)}</span>
                              <span className="font-medium">{formatCurrency(point.amount)}</span>
                            </div>
                          ))}
                        </div>
                        {intelligence.forecastSummary.forecasts.length > 6 ? (
                          <p className="text-xs text-muted-foreground">
                            {`${intelligence.forecastSummary.forecasts.length - 6} puntos adicionales en el módulo de pronóstico.`}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Aún no generamos un pronóstico. Ejecuta el modelo desde el módulo de analítica para visualizarlo aquí.
                      </p>
                    )}
                  </TabsContent>

                  <TabsContent value="recommendations" className="space-y-4">
                    {intelligence.isLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 2 }).map((_, index) => (
                          <Skeleton key={`rec-skeleton-${index}`} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : displayedRecommendations.length > 0 ? (
                      <div className="space-y-3">
                        {displayedRecommendations.map((recommendation) => {
                          const feedbackStatus =
                            intelligence.recommendationFeedback[recommendation.id] ?? "idle"
                          const isSending = feedbackStatus === "sending"
                          const isSent = feedbackStatus === "sent"

                          return (
                            <div
                              key={recommendation.id}
                              className="space-y-3 rounded-lg border border-border/60 bg-card/60 p-4"
                            >
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold">{recommendation.title}</p>
                                <Badge variant="outline">{recommendation.category}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {recommendation.description}
                              </p>
                              {recommendation.explanation ? (
                                <p className="text-xs text-muted-foreground">
                                  {recommendation.explanation}
                                </p>
                              ) : null}
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="gap-2"
                                  onClick={() =>
                                    intelligence.sendRecommendationFeedback(
                                      recommendation.id,
                                      "positive"
                                    )
                                  }
                                  disabled={isSending || isSent}
                                >
                                  <CheckCircle className="h-4 w-4" /> Me ayuda
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    intelligence.sendRecommendationFeedback(
                                      recommendation.id,
                                      "negative"
                                    )
                                  }
                                  disabled={isSending || isSent}
                                >
                                  No es relevante
                                </Button>
                                <span className="text-xs text-muted-foreground">
                                  Score IA: {(recommendation.score * 100).toFixed(0)}%
                                </span>
                                {isSent ? (
                                  <span className="text-xs font-medium text-emerald-500">
                                    Gracias por tu feedback
                                  </span>
                                ) : null}
                                {feedbackStatus === "error" ? (
                                  <span className="text-xs text-destructive">
                                    Hubo un error enviando tu respuesta
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          )
                        })}
                        {intelligence.recommendations.length > displayedRecommendations.length ? (
                          <p className="text-xs text-muted-foreground">
                            {`${intelligence.recommendations.length - displayedRecommendations.length} recomendaciones adicionales disponibles en el módulo dedicado.`}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Activa las recomendaciones automáticas para recibir acciones sugeridas según tus objetivos.
                      </p>
                    )}
                  </TabsContent>

                  <TabsContent value="insights" className="space-y-4">
                    {intelligence.isLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, index) => (
                          <Skeleton key={`insight-skeleton-${index}`} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : displayedInsights.length > 0 ? (
                      <div className="space-y-3">
                        {displayedInsights.map((insight) => (
                          <div
                            key={insight.id}
                            className="space-y-2 rounded-lg border border-border/60 bg-card/60 p-4"
                          >
                            <div className="flex items-center gap-2 text-sm font-semibold">
                              <Flame className="h-4 w-4 text-primary" />
                              {insight.title}
                            </div>
                            <p className="text-sm text-muted-foreground">{insight.description}</p>
                            {insight.highlight ? (
                              <p className="text-xs font-medium text-primary">
                                {insight.highlight}
                              </p>
                            ) : null}
                            {insight.metrics ? (
                              <div className="grid gap-3 sm:grid-cols-2">
                                {insight.metrics.map((metric) => (
                                  <div
                                    key={`${insight.id}-${metric.label}`}
                                    className="rounded-md border border-dashed border-primary/40 p-3"
                                  >
                                    <p className="text-xs text-muted-foreground">{metric.label}</p>
                                    <p className="text-lg font-semibold">{metric.value}</p>
                                    {metric.helperText ? (
                                      <p className="text-xs text-muted-foreground">
                                        {metric.helperText}
                                      </p>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ))}
                        {intelligence.insights.length > displayedInsights.length ? (
                          <p className="text-xs text-muted-foreground">
                            {`${intelligence.insights.length - displayedInsights.length} insights adicionales disponibles en el módulo de analítica.`}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Cuando habilites la generación de insights verás aquí los hallazgos priorizados.
                      </p>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <NotificationPanel
              isLoading={notifications.isLoading}
              notifications={notifications.notifications}
              preferences={notifications.preferences}
            />

            <Card className="border border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>Acciones rápidas</CardTitle>
                <CardDescription>
                  Accede a los módulos clave sin abandonar tu contexto actual.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button variant="ghost" className="justify-between" asChild>
                  <Link href="/accounts">
                    Revisar cuentas
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="ghost" className="justify-between" asChild>
                  <Link href="/transactions">
                    Ver transacciones
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="ghost" className="justify-between" asChild>
                  <Link href="/goals">
                    Ajustar metas
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function NotificationPanel({
  isLoading,
  notifications,
  preferences,
  mode = "detailed",
}: NotificationPanelProps) {
  const hasNotifications = notifications.length > 0

  return (
    <Card className={mode === "compact" ? "border border-border/70 bg-card/70 shadow-sm" : "border border-border/70 shadow-sm"}>
      <CardHeader className="space-y-1">
        <CardTitle className={mode === "compact" ? "text-base font-semibold" : undefined}>
          Centro de notificaciones
        </CardTitle>
        <CardDescription>
          {mode === "compact"
            ? "Un vistazo a los avisos más recientes."
            : "Resumen de eventos recientes y canales activos."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: mode === "compact" ? 1 : 3 }).map((_, index) => (
              <Skeleton key={`notification-skeleton-${mode}-${index}`} className="h-14 w-full" />
            ))}
          </div>
        ) : hasNotifications ? (
          <div className="space-y-3">
            {(mode === "compact" ? notifications.slice(0, 1) : notifications).map((notification) => (
              <div
                key={notification.id}
                className="rounded-lg border border-border/60 bg-card/60 p-3"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="line-clamp-2">{notification.message}</span>
                  <Badge variant="outline" className="capitalize">
                    {notification.channel}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(notification.createdAt)} · {notification.severity}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {mode === "compact"
              ? "Sin notificaciones pendientes por ahora."
              : "Todavía no tienes alertas. Configura tus reglas para recibir notificaciones contextualizadas."}
          </p>
        )}

        {mode === "detailed" && preferences ? (
          <div className="rounded-lg border border-dashed border-primary/40 p-4">
            <p className="text-xs text-muted-foreground">Canales activos</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["email", "push", "sms"] as const)
                .filter((channel) => preferences?.[channel])
                .map((channel) => (
                  <Badge key={channel} variant="secondary" className="capitalize">
                    {channel}
                  </Badge>
                ))}
            </div>
          </div>
        ) : null}
      </CardContent>
      {mode === "detailed" ? (
        <CardFooter className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="outline" size="sm" asChild className="gap-1">
            <Link href="/notifications">
              Revisar bandeja
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="link" size="sm" className="px-0" asChild>
            <Link href="/settings/notifications">Gestionar preferencias</Link>
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  )
}
