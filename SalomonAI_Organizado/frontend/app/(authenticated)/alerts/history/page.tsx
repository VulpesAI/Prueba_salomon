"use client"

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
import { Separator } from "@/components/ui/separator"

import { IS_DEMO_MODE, useDemoFinancialData } from "@/context/DemoFinancialDataContext"
import { formatCurrency, formatDate, formatRelativeDate } from "@/lib/intl"

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

type Metric = {
  title: string
  value: string
  helper: string
}

type Severity = "high" | "medium" | "low"

type TimelineEvent = {
  id: string
  title: string
  severity: Severity
  owner: string
  status: string
  timestamp: string
  notes: string
}

type ReminderSnapshot = {
  rent: {
    amount: number
    nextDate: Date | null
  }
  services: {
    total: number
    nextDate: Date | null
    names: string[]
  }
  unusual: {
    amount: number
    description: string
    date: Date | null
  }
}

const severityStyles: Record<Severity, { label: string; className: string }> = {
  high: {
    label: "Prioritario",
    className: "bg-amber-100 text-amber-700 border-amber-300",
  },
  medium: {
    label: "Seguimiento",
    className: "bg-sky-100 text-sky-700 border-sky-300",
  },
  low: {
    label: "Informativo",
    className: "bg-emerald-100 text-emerald-700 border-emerald-300",
  },
}

const toDate = (value: string) => new Date(`${value}T00:00:00`)

const getNextMonthlyOccurrence = (value: string | null | undefined) => {
  if (!value) {
    return null
  }

  const base = toDate(value)
  return new Date(base.getFullYear(), base.getMonth() + 1, base.getDate())
}

const getUpcomingDateFromDay = (dayOfMonth: number, reference = new Date()) => {
  const candidate = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    dayOfMonth,
    9,
    0,
    0,
    0
  )

  if (candidate <= reference) {
    candidate.setMonth(candidate.getMonth() + 1)
  }

  return candidate
}

const buildDueLabel = (date: Date | null, options?: Intl.DateTimeFormatOptions) => {
  if (!date) {
    return "Fecha por definir"
  }

  return `${formatRelativeDate(date)} · ${formatDate(date, options ?? { day: "2-digit", month: "short" })}`
}

const formatList = (items: string[]) => {
  if (items.length === 0) {
    return ""
  }

  if (items.length === 1) {
    return items[0]
  }

  if (items.length === 2) {
    return `${items[0]} y ${items[1]}`
  }

  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`
}

const buildMetrics = (snapshot: ReminderSnapshot): Metric[] => [
  {
    title: "Próximo pago de arriendo",
    value: formatCurrency(snapshot.rent.amount),
    helper: buildDueLabel(snapshot.rent.nextDate, { day: "2-digit", month: "long" }),
  },
  {
    title: "Servicios básicos del mes",
    value: formatCurrency(snapshot.services.total),
    helper:
      snapshot.services.names.length > 0
        ? `Incluye ${formatList(snapshot.services.names)}.`
        : "Configura recordatorios para tus cuentas del hogar.",
  },
  {
    title: "Gasto fuera de lo habitual",
    value: formatCurrency(snapshot.unusual.amount),
    helper:
      snapshot.unusual.date && snapshot.unusual.description
        ? `${formatDate(snapshot.unusual.date, { day: "2-digit", month: "long" })} · ${snapshot.unusual.description}.`
        : "Revisa tus movimientos para detectar gastos extra.",
  },
]

const buildTimeline = (snapshot: ReminderSnapshot): TimelineEvent[] => {
  const now = new Date()

  const rentEvent: TimelineEvent = {
    id: `rent-${snapshot.rent.nextDate?.toISOString() ?? "sin-datos"}`,
    title: "Transferencia de arriendo",
    severity: "high",
    owner: "Recordatorio personal",
    status:
      snapshot.rent.nextDate && snapshot.rent.nextDate > now ? "Pendiente" : "Pagado",
    timestamp: buildDueLabel(snapshot.rent.nextDate),
    notes: `Agenda la transferencia de ${formatCurrency(snapshot.rent.amount)} para evitar recargos.`,
  }

  const servicesEvent: TimelineEvent = {
    id: `services-${snapshot.services.nextDate?.toISOString() ?? "sin-datos"}`,
    title: "Cuentas de servicios",
    severity: "medium",
    owner: "Agenda personal",
    status:
      snapshot.services.nextDate && snapshot.services.nextDate > now
        ? "En preparación"
        : "Pagado",
    timestamp: buildDueLabel(snapshot.services.nextDate),
    notes:
      snapshot.services.names.length > 0
        ? `Anota recordatorio para ${formatList(snapshot.services.names)}.`
        : "Suma tus cuentas del hogar para recibir avisos a tiempo.",
  }

  const unusualEvent: TimelineEvent = {
    id: `unusual-${snapshot.unusual.date?.toISOString() ?? "sin-datos"}`,
    title: snapshot.unusual.description || "Revisa gastos extraordinarios",
    severity: "low",
    owner: "Seguimiento personal",
    status: "Revisar",
    timestamp: snapshot.unusual.date
      ? `${formatRelativeDate(snapshot.unusual.date)} · ${formatDate(snapshot.unusual.date, { day: "2-digit", month: "short" })}`
      : "Cada semana",
    notes:
      snapshot.unusual.description
        ? `Confirma si corresponde dividir o solicitar reembolso de ${formatCurrency(snapshot.unusual.amount)}.`
        : "Marca aquí cualquier gasto que necesite seguimiento.",
  }

  return [rentEvent, servicesEvent, unusualEvent]
}

const buildFallbackSnapshot = (): ReminderSnapshot => {
  const now = new Date()
  const fallbackRentDate = getUpcomingDateFromDay(5, now)
  const fallbackServicesDate = getUpcomingDateFromDay(12, now)
  const fallbackUnusualDate = new Date(now)
  fallbackUnusualDate.setDate(now.getDate() - 3)

  return {
    rent: {
      amount: 620_000,
      nextDate: fallbackRentDate,
    },
    services: {
      total: 113_490,
      nextDate: fallbackServicesDate,
      names: ["Cuenta de luz", "Cuenta de agua", "Plan celular"],
    },
    unusual: {
      amount: 145_000,
      description: "Mecánico taller",
      date: fallbackUnusualDate,
    },
  }
}

export default function AlertsHistoryPage() {
  const { statement } = useDemoFinancialData()

  const fallbackSnapshot = useMemo(buildFallbackSnapshot, [])

  const reminderSnapshot = useMemo<ReminderSnapshot>(() => {
    if (!IS_DEMO_MODE || !statement) {
      return fallbackSnapshot
    }

    const transactions = statement.transactions.slice().sort((a, b) =>
      a.date < b.date ? 1 : -1
    )
    const expenses = transactions.filter((transaction) => transaction.amount < 0)

    const rentPayment = expenses.find((transaction) =>
      /arriendo/i.test(transaction.description)
    )
    const rentAmount = rentPayment
      ? Math.abs(rentPayment.amount)
      : fallbackSnapshot.rent.amount
    const rentNextDate = rentPayment?.date
      ? getNextMonthlyOccurrence(rentPayment.date)
      : fallbackSnapshot.rent.nextDate

    const serviceExpenses = expenses.filter(
      (transaction) => transaction.category === "Servicios"
    )
    const latestTransactionDate = transactions[0]?.date
    const referenceDate = latestTransactionDate
      ? toDate(latestTransactionDate)
      : new Date()

    const servicesThisCycle = serviceExpenses.filter((transaction) => {
      const date = toDate(transaction.date)
      return (
        date.getFullYear() === referenceDate.getFullYear() &&
        date.getMonth() === referenceDate.getMonth()
      )
    })

    const servicesSample = servicesThisCycle.length
      ? servicesThisCycle
      : serviceExpenses.slice(0, Math.min(2, serviceExpenses.length))

    const servicesTotal = servicesSample.length
      ? servicesSample.reduce(
          (total, transaction) => total + Math.abs(transaction.amount),
          0
        )
      : fallbackSnapshot.services.total

    const serviceNames = servicesSample.length
      ? servicesSample.map((transaction) => transaction.description)
      : fallbackSnapshot.services.names

    const servicesNextDate = servicesSample[0]?.date
      ? getNextMonthlyOccurrence(servicesSample[0].date)
      : fallbackSnapshot.services.nextDate

    const unusualExpense = expenses
      .filter(
        (transaction) =>
          !/arriendo/i.test(transaction.description) &&
          !/cuenta/i.test(transaction.description) &&
          !/supermercado/i.test(transaction.description) &&
          !/sueldo/i.test(transaction.description)
      )
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0]

    const unusualAmount = unusualExpense
      ? Math.abs(unusualExpense.amount)
      : fallbackSnapshot.unusual.amount

    const unusualDescription =
      unusualExpense?.description ?? fallbackSnapshot.unusual.description
    const unusualDate = unusualExpense?.date
      ? toDate(unusualExpense.date)
      : fallbackSnapshot.unusual.date

    return {
      rent: {
        amount: rentAmount,
        nextDate: rentNextDate,
      },
      services: {
        total: servicesTotal,
        nextDate: servicesNextDate,
        names: serviceNames,
      },
      unusual: {
        amount: unusualAmount,
        description: unusualDescription,
        date: unusualDate,
      },
    }
  }, [fallbackSnapshot, statement])

  const metrics = useMemo(() => buildMetrics(reminderSnapshot), [reminderSnapshot])
  const timeline = useMemo(() => buildTimeline(reminderSnapshot), [reminderSnapshot])

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Historial de alertas
          </h1>
          <p className="text-sm text-muted-foreground">
            Consulta eventos pasados, recordatorios clave y el seguimiento de
            tus acciones.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          {metrics.map((metric) => (
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
              Línea de tiempo con tus recordatorios personales y avances.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="relative space-y-8 border-l border-dashed border-border pl-6">
              {timeline.map((event) => (
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
                      <Badge
                        className={`border ${severityStyles[event.severity].className}`}
                        variant="outline"
                      >
                        {severityStyles[event.severity].label}
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
