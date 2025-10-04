"use client"

import Link from "next/link"
import { useMemo } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

type Severity = "critical" | "high" | "medium" | "low"

const severityStyles: Record<Severity, { label: string; className: string }> = {
  critical: {
    label: "Crítica",
    className: "bg-destructive/15 text-destructive border-destructive/40",
  },
  high: {
    label: "Alta",
    className: "bg-amber-100 text-amber-700 border-amber-300",
  },
  medium: {
    label: "Media",
    className: "bg-sky-100 text-sky-700 border-sky-300",
  },
  low: {
    label: "Baja",
    className: "bg-emerald-100 text-emerald-700 border-emerald-300",
  },
}

const PRIORITIZED_ALERTS = [
  {
    id: "ALT-2041",
    title: "Desbalance detectado en cuentas corporativas",
    severity: "critical" as Severity,
    source: "Modelo predictivo de flujo",
    dueDate: "En 2 horas",
    etaProgress: 80,
    status: "pendiente",
    response: "Escalar a equipo de tesorería",
  },
  {
    id: "ALT-2034",
    title: "Pago recurrente rechazado",
    severity: "high" as Severity,
    source: "Regla de conciliación",
    dueDate: "Hoy 16:00",
    etaProgress: 45,
    status: "reintentar",
    response: "Reintentar cargo y notificar cliente",
  },
  {
    id: "ALT-1980",
    title: "Ingreso inusual de origen no identificado",
    severity: "medium" as Severity,
    source: "Monitoreo antifraude",
    dueDate: "Mañana",
    etaProgress: 10,
    status: "seguimiento",
    response: "Revisar documentación tributaria",
  },
]

const RESPONSE_PLAYBOOK = [
  {
    title: "Asignar responsable",
    description: "María González · Equipo Tesorería",
    status: "En curso",
  },
  {
    title: "Validar información con proveedor",
    description: "Pendiente · Tiempo estimado 30m",
    status: "Pendiente",
  },
  {
    title: "Registrar resolución",
    description: "Listo para documentación",
    status: "Bloqueado",
  },
]

const CHANNEL_INTEGRATIONS = [
  {
    name: "Slack",
    description: "Recibe alertas críticas en el canal #finanzas-ops.",
    href: "https://slack.com/apps",
  },
  {
    name: "Email",
    description: "Envía reportes programados a tu equipo de cumplimiento.",
    href: "mailto:integraciones@tuempresa.com",
  },
  {
    name: "Webhook",
    description: "Orquesta automatizaciones en tus sistemas internos.",
    href: "https://docs.tuempresa.com/webhooks",
  },
]

export default function AlertsPage() {
  // TODO: Reemplazar los datos mock por GET /api/alerts?status=active y gestionar estado de carga.
  const orderedAlerts = useMemo(() => PRIORITIZED_ALERTS, [])

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Centro de alertas
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestiona alertas generadas por IA, reglas personalizadas y estados
            de resolución.
          </p>
        </header>

        <Card>
          <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Alertas activas</CardTitle>
              <CardDescription>
                Listado priorizado con severidad, fuente y fecha prevista de
                impacto.
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/integraciones">
                Ver integraciones conectadas
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              {orderedAlerts.map((alert) => {
                const severity = severityStyles[alert.severity]

                return (
                  <div
                    key={alert.id}
                    className="rounded-lg border border-border/60 bg-card p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            className={`border ${severity.className}`}
                            variant="outline"
                          >
                            {severity.label}
                          </Badge>
                          <span className="text-xs font-medium text-muted-foreground">
                            {alert.id}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {alert.source}
                          </span>
                        </div>
                        <h3 className="text-base font-semibold leading-tight">
                          {alert.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {alert.response}
                        </p>
                      </div>
                      <div className="flex flex-col items-start gap-3 text-sm lg:items-end">
                        <div className="text-right">
                          <p className="font-medium text-muted-foreground">
                            ETA
                          </p>
                          <p className="text-base font-semibold">
                            {alert.dueDate}
                          </p>
                        </div>
                        <Progress value={alert.etaProgress} className="w-40" />
                        {alert.status === "reintentar" ? (
                          <Button size="sm" variant="default">
                            Reintentar sincronización
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline">
                            Registrar actualización
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Acciones de respuesta</CardTitle>
            <CardDescription>
              Tareas sugeridas, responsables y notas colaborativas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="relative space-y-6 border-l border-dashed border-border pl-6">
              {RESPONSE_PLAYBOOK.map((step, index) => (
                <li key={step.title} className="space-y-2">
                  <span className="absolute -left-[9px] mt-2 h-4 w-4 rounded-full border border-border bg-background" />
                  <p className="text-sm text-muted-foreground">
                    Paso {index + 1}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold leading-tight">
                      {step.title}
                    </h3>
                    <Badge variant="secondary">{step.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Integraciones</CardTitle>
            <CardDescription>
              Conexiones con canales externos como email, Slack o SMS.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {CHANNEL_INTEGRATIONS.map((channel) => (
              <div
                key={channel.name}
                className="flex flex-col justify-between rounded-lg border border-border/60 bg-muted/30 p-4"
              >
                <div className="space-y-1">
                  <h3 className="text-base font-semibold">{channel.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {channel.description}
                  </p>
                </div>
                <Button asChild className="mt-4" variant="secondary">
                  <Link href={channel.href} target="_blank" rel="noreferrer">
                    Configurar canal
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
