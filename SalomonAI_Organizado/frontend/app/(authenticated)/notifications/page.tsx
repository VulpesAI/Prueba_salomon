"use client"

import { EmptyState } from "@/components/ui/empty-state"
import { ErrorBanner } from "@/components/ui/error-banner"
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
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  type NotificationChannel,
  type NotificationSeverity,
  useDashboardNotifications,
} from "@/hooks/dashboard/use-dashboard-notifications"
import { Bell, RefreshCcw } from "lucide-react"

import { cn } from "@/lib/utils"

const channelConfig: Record<
  NotificationChannel,
  { label: string; badgeVariant: "default" | "secondary" | "destructive" | "outline" }
> = {
  email: { label: "Correo electrónico", badgeVariant: "outline" },
  push: { label: "Push móvil", badgeVariant: "secondary" },
  sms: { label: "SMS", badgeVariant: "default" },
  in_app: { label: "Dentro de la app", badgeVariant: "outline" },
}

const severityConfig: Record<
  NotificationSeverity,
  { label: string; badgeVariant: "default" | "secondary" | "destructive" | "outline" }
> = {
  info: { label: "Informativa", badgeVariant: "outline" },
  warning: { label: "Advertencia", badgeVariant: "secondary" },
  critical: { label: "Crítica", badgeVariant: "destructive" },
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

export default function NotificationsPage() {
  const {
    notifications,
    isLoading,
    isFetching,
    isError,
    error,
    refresh,
    apiBaseUrl,
  } = useDashboardNotifications()

  const unreadCount = notifications.filter((notification) => !notification.read).length
  const handleRefresh = () => refresh()
  const showEmptyState = !isLoading && notifications.length === 0 && !isError

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold tracking-tight">
              Historial de notificaciones
            </h1>
          </div>
          <p className="text-muted-foreground">
            Monitorea los envíos realizados por cada canal y verifica qué mensajes siguen pendientes de lectura.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            className="gap-2"
            disabled={isFetching}
          >
            <RefreshCcw className={cn("h-4 w-4", isFetching && "animate-spin")} aria-hidden />
            {isFetching ? "Actualizando" : "Actualizar"}
          </Button>
          <Badge variant={unreadCount > 0 ? "default" : "secondary"}>
            {unreadCount > 0
              ? `${unreadCount} notificaciones sin leer`
              : "Todo al día"}
          </Badge>
        </div>
      </div>

      {isError ? (
        <ErrorBanner
          error={error}
          title="No pudimos cargar el historial"
          description={`Verifica la conexión con ${apiBaseUrl}/notifications e inténtalo nuevamente.`}
          onRetry={handleRefresh}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Eventos recientes</CardTitle>
          <CardDescription>
            Los datos se obtienen desde <code>{`${apiBaseUrl}/notifications`}</code> y conservan el
            estado de lectura local mientras se integra la API real.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`notifications-skeleton-${index}`} className="grid gap-4 md:grid-cols-4">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          ) : showEmptyState ? (
            <EmptyState
              icon={Bell}
              title="Sin notificaciones disponibles"
              description="Cuando conectes el servicio, verás aquí los eventos recientes clasificados por canal y severidad."
              cta={{ label: "Configurar canales", href: "/integraciones" }}
            />
          ) : (
            <Table aria-busy={isFetching} data-state={isFetching ? "loading" : undefined}>
              <TableHeader>
                <TableRow>
                  <TableHead>Mensaje</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Severidad</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((notification) => (
                  <TableRow
                    key={notification.id}
                    data-state={notification.read ? undefined : "selected"}
                  >
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium leading-tight">{notification.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(notification.createdAt)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={channelConfig[notification.channel].badgeVariant}>
                        {channelConfig[notification.channel].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={severityConfig[notification.severity].badgeVariant}>
                        {severityConfig[notification.severity].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={notification.read ? "secondary" : "default"}>
                        {notification.read ? "Leída" : "Pendiente"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableCaption>
                {unreadCount > 0
                  ? "Prioriza las notificaciones pendientes para mantener a los usuarios informados."
                  : "¡Excelente! Todas las notificaciones fueron revisadas."}
              </TableCaption>
            </Table>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardDescription>
            Marca los elementos como revisados desde el canal correspondiente
            o usa el endpoint PATCH <code>{`${apiBaseUrl}/notifications/:id/mark-read`}</code>.
          </CardDescription>
          <CardDescription>
            Controla la cadencia de envíos ajustando la configuración en cada canal para evitar ruido innecesario.
          </CardDescription>
        </CardFooter>
      </Card>
    </div>
  )
}
