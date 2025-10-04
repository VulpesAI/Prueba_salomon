"use client"

import { useState } from "react"

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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

const DEFAULT_CHANNELS = [
  { key: "email", label: "Email", description: "Reportes diarios y alertas críticas." },
  { key: "push", label: "Push", description: "Notificaciones rápidas en la app." },
  { key: "sms", label: "SMS", description: "Mensajes para incidencias de alta prioridad." },
  { key: "webhook", label: "Webhook", description: "Sincroniza con tus sistemas internos." },
]

const QUIET_HOURS = {
  start: "22:00",
  end: "07:00",
}

const DEFAULT_RULES = [
  {
    id: "RULE-01",
    name: "Pagos rechazados",
    severity: "Alta",
    channels: ["email", "sms"],
  },
  {
    id: "RULE-02",
    name: "Variaciones de flujo de caja",
    severity: "Media",
    channels: ["email", "push"],
  },
]

export default function AlertsPreferencesPage() {
  // TODO: Sustituir estado local por GET /api/alerts/preferences y persistir con PUT /api/alerts/preferences.
  const [channels, setChannels] = useState(() =>
    Object.fromEntries(DEFAULT_CHANNELS.map((channel) => [channel.key, true]))
  )

  const [rules] = useState(DEFAULT_RULES)

  const toggleChannel = (key: string) => {
    setChannels((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Preferencias de alertas
          </h1>
          <p className="text-sm text-muted-foreground">
            Configura canales, horarios y reglas automáticas para
            notificaciones.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Canales configurados</CardTitle>
            <CardDescription>
              Email, push, SMS y webhooks con su estado actual.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {DEFAULT_CHANNELS.map((channel) => (
              <div
                key={channel.key}
                className="flex flex-col gap-2 rounded-lg border border-border/50 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold">{channel.label}</h3>
                    {channel.key === "webhook" && (
                      <Badge variant="secondary">Automatiza</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {channel.description}
                  </p>
                </div>
                <Switch
                  checked={channels[channel.key]}
                  onCheckedChange={() => toggleChannel(channel.key)}
                />
              </div>
            ))}
          </CardContent>
          <CardFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Activa o pausa canales según la carga operativa.
            </p>
            <Button variant="outline">Gestionar integraciones externas</Button>
          </CardFooter>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Ventanas de silencio</CardTitle>
            <CardDescription>
              Horarios en los que no se envían notificaciones automáticas.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quiet-start">Inicio</Label>
              <Input id="quiet-start" type="time" defaultValue={QUIET_HOURS.start} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quiet-end">Fin</Label>
              <Input id="quiet-end" type="time" defaultValue={QUIET_HOURS.end} />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="quiet-notes">Notas</Label>
              <Textarea
                id="quiet-notes"
                placeholder="Ej. evitar notificaciones en fines de semana o feriados."
              />
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button>Actualizar horario</Button>
          </CardFooter>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Reglas personalizadas</CardTitle>
            <CardDescription>
              Crea condiciones y niveles de severidad por tipo de evento.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form className="space-y-4 rounded-lg border border-dashed border-border/60 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="rule-name">Nombre de la regla</Label>
                  <Input id="rule-name" placeholder="Ej. Pagos rechazados en serie" />
                </div>
                <div className="space-y-2">
                  <Label>Severidad</Label>
                  <Select defaultValue="alta">
                    <SelectTrigger aria-label="Selecciona severidad">
                      <SelectValue placeholder="Selecciona severidad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critica">Crítica</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="baja">Baja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rule-conditions">Condiciones</Label>
                <Textarea
                  id="rule-conditions"
                  placeholder="Ej. si el monto supera 5.000.000 CLP y ocurre más de 2 veces en 24h"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rule-channels">Canales asociados</Label>
                <Textarea
                  id="rule-channels"
                  placeholder="Especifica cómo distribuir la alerta: Slack, Email, SMS, etc."
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button type="reset" variant="ghost">
                  Limpiar
                </Button>
                <Button type="submit">Guardar regla</Button>
              </div>
            </form>

            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Reglas existentes
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="rounded-lg border border-border/40 bg-muted/30 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-semibold">{rule.name}</h4>
                      <Badge className="border border-amber-300 bg-amber-100 text-amber-700" variant="outline">
                        {rule.severity}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
                      Canales: {rule.channels.join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Define reglas consistentes para automatizar tu respuesta.
            </p>
            <Button variant="outline">Sincronizar con tu motor de reglas</Button>
          </CardFooter>
        </Card>
      </section>
    </div>
  )
}
