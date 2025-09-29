"use client"

import Link from "next/link"
import { useCallback, useMemo } from "react"

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
import { Skeleton } from "@/components/ui/skeleton"
import { useDashboardIntelligence } from "@/hooks/dashboard/use-dashboard-intelligence"
import { useDashboardNotifications } from "@/hooks/dashboard/use-dashboard-notifications"
import {
  PLACEHOLDER_CURRENCY,
  useDashboardOverview,
} from "@/hooks/dashboard/use-dashboard-overview"
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle,
  ChevronRight,
  Flame,
  RefreshCcw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react"

const DASHBOARD_LOCALE = "es-CL"

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(DASHBOARD_LOCALE, {
    day: "numeric",
    month: "short",
  })

export default function DashboardOverviewPage() {
  const overview = useDashboardOverview()
  const intelligence = useDashboardIntelligence()
  const notifications = useDashboardNotifications()
  const { refresh: refreshOverview } = overview
  const { refresh: refreshIntelligence } = intelligence
  const { refresh: refreshNotifications } = notifications

  const activeCurrency = useMemo(
    () => overview.currency ?? PLACEHOLDER_CURRENCY,
    [overview.currency]
  )

  const formatCurrency = useCallback(
    (value?: number | null) => {
      const amount = typeof value === "number" ? value : 0

      return new Intl.NumberFormat(DASHBOARD_LOCALE, {
        style: "currency",
        currency: activeCurrency,
        maximumFractionDigits: 0,
      }).format(amount)
    },
    [activeCurrency]
  )

  const percentageFormatter = useMemo(
    () =>
      new Intl.NumberFormat(DASHBOARD_LOCALE, {
        style: "percent",
        maximumFractionDigits: 0,
      }),
    []
  )

  const formatPercentage = useCallback(
    (value: number) => percentageFormatter.format(value),
    [percentageFormatter]
  )

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
    [formatCurrency, overview.totals]
  )

  const handleRefresh = useCallback(() => {
    void refreshOverview()
    void refreshIntelligence()
    void refreshNotifications()
  }, [refreshIntelligence, refreshNotifications, refreshOverview])

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            Resumen general
          </h1>
          <p className="text-muted-foreground">
            Visualiza el estado consolidado de tus finanzas, listas para profundizar en cada módulo.
          </p>
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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {overview.isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <Card key={`overview-skeleton-${index}`}>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-28" />
                </CardContent>
              </Card>
            ))
          : totalsCards.map((card) => (
              <Card key={card.title}>
                <CardHeader>
                  <CardTitle>{card.title}</CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-semibold">{card.value}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <card.trend.icon className="h-4 w-4" />
                    <span>{card.trend.helper}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
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

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Cuentas conectadas</CardTitle>
                <CardDescription>
                  Detalle consolidado por institución y tipo de producto.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/accounts" className="gap-1">
                  Ver cuentas <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {overview.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={`account-skeleton-${index}`} className="h-16 w-full" />
                ))}
              </div>
            ) : overview.accounts.length > 0 ? (
              <div className="space-y-3">
                {overview.accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-start justify-between rounded-lg border bg-card/40 p-4"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{account.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {account.institution ?? "Institución desconocida"}
                      </p>
                      {account.type ? (
                        <Badge variant="secondary">{account.type}</Badge>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">
                        {formatCurrency(account.balance)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {account.currency ?? PLACEHOLDER_CURRENCY}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Vincula tus cuentas bancarias para comenzar a analizar tus finanzas.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Transacciones recientes</CardTitle>
                <CardDescription>
                  Últimos movimientos categorizados durante la sincronización.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/transactions" className="gap-1">
                  Ver todas <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {overview.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={`transaction-skeleton-${index}`} className="h-14 w-full" />
                ))}
              </div>
            ) : overview.recentTransactions.length > 0 ? (
              <div className="space-y-3">
                {overview.recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between rounded-lg border bg-card/40 p-4"
                  >
                    <div>
                      <p className="text-sm font-semibold">{transaction.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(transaction.date)} · {transaction.category ?? "Sin categoría"}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={transaction.amount >= 0 ? "text-emerald-500" : "text-destructive"}
                      >
                        {transaction.amount >= 0 ? (
                          <ArrowUpRight className="mr-1 inline h-4 w-4" />
                        ) : (
                          <ArrowDownRight className="mr-1 inline h-4 w-4" />
                        )}
                        {formatCurrency(Math.abs(transaction.amount))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No registramos movimientos recientes. Sincroniza nuevas cuentas o descarga tu historial.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribución por categoría</CardTitle>
            <CardDescription>
              Identifica rápidamente dónde se concentran tus gastos e ingresos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overview.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={`category-skeleton-${index}`} className="h-10 w-full" />
                ))}
              </div>
            ) : overview.categoryBreakdown.length > 0 ? (
              <div className="space-y-3">
                {overview.categoryBreakdown.map((category) => (
                  <div key={category.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{category.name}</span>
                      <span className="font-medium">
                        {formatCurrency(category.amount)} · {category.percentage}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${category.percentage}%`,
                          backgroundColor: category.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Cuando clasifiques transacciones verás la distribución por categoría en esta sección.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Alertas predictivas</CardTitle>
                <CardDescription>
                  Anticipa eventos relevantes detectados por el modelo de flujo de caja.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/alerts" className="gap-1">
                  Ir al centro <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {intelligence.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, index) => (
                  <Skeleton key={`alert-skeleton-${index}`} className="h-16 w-full" />
                ))}
              </div>
            ) : intelligence.predictiveAlerts.length > 0 ? (
              intelligence.predictiveAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-lg border border-border/60 bg-card/40 p-4"
                >
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      {alert.message}
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {alert.severity}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Proyección: {formatDate(alert.forecastDate)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay alertas pendientes. Mantén conectadas tus cuentas para recibir proyecciones tempranas.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Insights destacados</CardTitle>
            <CardDescription>
              Hallazgos automáticos que puedes validar antes de integrarlos a tus reportes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {intelligence.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={`insight-skeleton-${index}`} className="h-20 w-full" />
                ))}
              </div>
            ) : intelligence.insights.length > 0 ? (
              <div className="space-y-4">
                {intelligence.insights.map((insight) => (
                  <div
                    key={insight.id}
                    className="rounded-lg border border-border/60 bg-card/40 p-4"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Flame className="h-4 w-4 text-primary" />
                      {insight.title}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {insight.description}
                    </p>
                    {insight.highlight ? (
                      <p className="mt-2 text-xs font-medium text-primary">
                        {insight.highlight}
                      </p>
                    ) : null}
                    {insight.metrics ? (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {insight.metrics.map((metric) => (
                          <div
                            key={`${insight.id}-${metric.label}`}
                            className="rounded-md border border-dashed border-primary/40 p-3"
                          >
                            <p className="text-xs text-muted-foreground">
                              {metric.label}
                            </p>
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
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Cuando habilites la generación de insights verás aquí los hallazgos priorizados.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pronóstico de flujo</CardTitle>
            <CardDescription>
              Última corrida del modelo predictivo con horizonte a 30 días.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {intelligence.isLoading || !intelligence.forecastSummary ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{intelligence.forecastSummary.modelType}</p>
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
                <div className="rounded-lg border border-dashed border-primary/40 p-4">
                  <p className="text-xs text-muted-foreground">
                    Cambio estimado
                  </p>
                  <p className="text-2xl font-semibold">
                    {formatCurrency(intelligence.forecastSummary.trend.change)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatPercentage(intelligence.forecastSummary.trend.changePercentage)} respecto al promedio histórico
                  </p>
                </div>
                <div className="space-y-2">
                  {intelligence.forecastSummary.forecasts.map((point) => (
                    <div key={point.date} className="flex items-center justify-between text-xs">
                      <span>{formatDate(point.date)}</span>
                      <span className="font-medium">{formatCurrency(point.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recomendaciones personalizadas</CardTitle>
            <CardDescription>
              Ajusta y comparte feedback para mejorar la priorización de acciones sugeridas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {intelligence.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, index) => (
                  <Skeleton key={`rec-skeleton-${index}`} className="h-20 w-full" />
                ))}
              </div>
            ) : intelligence.recommendations.length > 0 ? (
              intelligence.recommendations.map((recommendation) => {
                const feedbackStatus = intelligence.recommendationFeedback[recommendation.id] ?? "idle"
                const isSending = feedbackStatus === "sending"
                const isSent = feedbackStatus === "sent"

                return (
                  <div
                    key={recommendation.id}
                    className="rounded-lg border border-border/60 bg-card/40 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{recommendation.title}</p>
                      <Badge variant="outline">{recommendation.category}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {recommendation.description}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {recommendation.explanation}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="gap-2"
                        onClick={() => intelligence.sendRecommendationFeedback(recommendation.id, "positive")}
                        disabled={isSending || isSent}
                      >
                        <CheckCircle className="h-4 w-4" /> Me ayuda
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => intelligence.sendRecommendationFeedback(recommendation.id, "negative")}
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
              })
            ) : (
              <p className="text-sm text-muted-foreground">
                Activa las recomendaciones automáticas para recibir acciones sugeridas según tus objetivos.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Centro de notificaciones</CardTitle>
            <CardDescription>
              Resumen de eventos recientes y canales activos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {notifications.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={`notif-skeleton-${index}`} className="h-14 w-full" />
                ))}
              </div>
            ) : notifications.notifications.length > 0 ? (
              <div className="space-y-3">
                {notifications.notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="rounded-lg border border-border/60 bg-card/40 p-3"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span>{notification.message}</span>
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
                Todavía no tienes alertas. Configura tus reglas para recibir notificaciones contextualizadas.
              </p>
            )}
            {notifications.preferences ? (
              <div className="rounded-lg border border-dashed border-primary/40 p-4">
                <p className="text-xs text-muted-foreground">Canales activos</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["email", "push", "sms"] as const)
                    .filter((channel) => notifications.preferences?.[channel])
                    .map((channel) => (
                      <Badge key={channel} variant="secondary" className="capitalize">
                        {channel}
                      </Badge>
                    ))}
                </div>
                <Button variant="link" className="mt-2 px-0" asChild>
                  <Link href="/settings/notifications">Gestionar preferencias</Link>
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
