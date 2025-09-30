"use client"

import { PlaceholderPage } from "@/components/authenticated/placeholder-page"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { useDashboardNotifications } from "@/hooks/dashboard/use-dashboard-notifications"
import type {
  NotificationChannel,
  NotificationSeverity,
} from "@/types/dashboard"
import { AlertCircle, Bell, RefreshCcw } from "lucide-react"

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
    error,
    refresh,
    apiBaseUrl,
  } = useDashboardNotifications()

  const unreadCount = notifications.filter((notification) => !notification.read).length

  if (!isLoading && notifications.length === 0 && !error) {
    return (
      <PlaceholderPage
        title="Historial de notificaciones"
        description="Integra el servicio de notificaciones para mostrar eventos recientes con su canal y estado de lectura."
        sections={[
          {
            title: "Listado de eventos",
            description:
              "Consulta GET /notifications para poblar la tabla con mensaje, canal, severidad y marca de lectura.",
            skeletons: 4,
          },
          {
            title: "Gestión de lectura",
            description:
              "Agrega acciones para PATCH /notifications/:id/mark-read y mantener sincronizado el estado.",
            skeletons: 2,
          },
          {
            title: "Filtros por canal",
            description:
              "Permite segmentar por email, push, SMS o in-app para priorizar seguimientos.",
            skeletons: 2,
            layout: "list",
          },
        ]}
      />
    )
  }

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
          <Button variant="outline" onClick={() => refresh()} className="gap-2">
            <RefreshCcw className="h-4 w-4" /> Actualizar
          </Button>
          <Badge variant={unreadCount > 0 ? "default" : "secondary"}>
            {unreadCount > 0
              ? `${unreadCount} notificaciones sin leer`
              : "Todo al día"}
          </Badge>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No pudimos cargar el historial</AlertTitle>
          <AlertDescription>
            {error}. Verifica la conexión con {`${apiBaseUrl}/notifications`} y reintenta.
          </AlertDescription>
        </Alert>
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
          ) : (
            <Table>
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
                  ? `${unreadCount} notificaciones requieren seguimiento.`
                  : "No hay notificaciones pendientes."}
              </TableCaption>
            </Table>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
          <p>
            Conecta la mutación <code>PATCH /notifications/:id/mark-read</code> para
            sincronizar cambios de estado después de interactuar con cada registro.
          </p>
          <p>
            El hook <code>useDashboardNotifications</code> centraliza la carga inicial y el refresco,
            ideal para compartir lógica entre el dashboard y este módulo dedicado.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
