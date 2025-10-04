import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

const SLA_METRICS = [
  {
    title: "Tiempo promedio de resolución",
    value: "2h 18m",
    helper: "Objetivo < 3h",
  },
  {
    title: "Alertas resueltas en SLA",
    value: "87%",
    helper: "+5 pp vs. semana anterior",
  },
  {
    title: "Escalamientos",
    value: "12 casos",
    helper: "4 en curso",
  },
]

const ALERT_TIMELINE = [
  {
    id: "ALT-2034",
    title: "Pago recurrente rechazado",
    severity: "Alta",
    owner: "María González",
    status: "Resuelta",
    timestamp: "Hoy · 11:15",
    notes: "Se reintentó el cargo y se notificó al cliente.",
  },
  {
    id: "ALT-2020",
    title: "Variación anómala en gastos de marketing",
    severity: "Media",
    owner: "Equipo FP&A",
    status: "En seguimiento",
    timestamp: "Ayer · 18:42",
    notes: "Pendiente de validación con proveedor.",
  },
  {
    id: "ALT-1980",
    title: "Ingreso inusual de origen no identificado",
    severity: "Alta",
    owner: "Analista de riesgo",
    status: "Escalada",
    timestamp: "Ayer · 09:10",
    notes: "Se escaló a cumplimiento y se pausaron transferencias.",
  },
]

const EXPORT_FORMATS = [
  {
    label: "CSV",
    description: "Compatible con hojas de cálculo y BI.",
  },
  {
    label: "PDF",
    description: "Ideal para auditorías y reportes ejecutivos.",
  },
  {
    label: "JSON",
    description: "Integración directa con tus pipelines.",
  },
]

export default function AlertsHistoryPage() {
  // TODO: Conectar con GET /api/alerts/history y GET /api/alerts/metrics para datos en tiempo real.
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Historial de alertas
          </h1>
          <p className="text-sm text-muted-foreground">
            Consulta eventos pasados, tiempos de respuesta y seguimiento de
            acciones.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          {SLA_METRICS.map((metric) => (
            <Card key={metric.title}>
              <CardHeader className="space-y-2">
                <CardTitle className="text-base">{metric.title}</CardTitle>
                <CardDescription>{metric.helper}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{metric.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Cronología</CardTitle>
            <CardDescription>
              Línea de tiempo con cada alerta, responsable y resultado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="relative space-y-8 border-l border-dashed border-border pl-6">
              {ALERT_TIMELINE.map((event) => (
                <li key={event.id} className="space-y-3">
                  <span className="absolute -left-[9px] mt-1.5 h-4 w-4 rounded-full border border-border bg-background" />
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      {event.timestamp}
                    </p>
                    <Badge variant="secondary">{event.status}</Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold leading-tight">
                        {event.title}
                      </h3>
                      <Badge className="border border-amber-300 bg-amber-100 text-amber-700" variant="outline">
                        {event.severity}
                      </Badge>
                      <span className="text-xs font-medium text-muted-foreground">
                        {event.id}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Responsable: {event.owner}
                    </p>
                    <p className="text-sm text-muted-foreground">{event.notes}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Exportación</CardTitle>
            <CardDescription>
              Descarga el historial en formatos compatibles con auditoría.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {EXPORT_FORMATS.map((format, index) => (
              <div key={format.label}>
                <div className="flex flex-col gap-4 rounded-lg border border-border/50 bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-base font-semibold">{format.label}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format.description}
                    </p>
                  </div>
                  <Button variant="outline">Descargar</Button>
                </div>
                {index < EXPORT_FORMATS.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
