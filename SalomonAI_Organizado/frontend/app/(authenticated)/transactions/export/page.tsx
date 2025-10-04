"use client"

import { useMemo, useState } from "react"
import { FileJson, FileText, Table } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { useDemoFinancialData } from "@/context/DemoFinancialDataContext"
import {
  DEMO_PERSONAL_DATA,
  exportStatementAsCsv,
  exportStatementAsJson,
  exportStatementAsPdf,
  getStatementDateRange,
  type ExportFormat,
} from "@/lib/exporters"
import { formatCurrency, formatDate } from "@/lib/intl"

const exportActions: Record<ExportFormat, typeof exportStatementAsCsv> = {
  csv: exportStatementAsCsv,
  json: exportStatementAsJson,
  pdf: exportStatementAsPdf,
}

type ExportState = "idle" | "loading" | "success" | "error"

const actionLabels: Record<ExportFormat, { title: string; description: string; icon: typeof FileText }> = {
  csv: {
    title: "Descargar CSV",
    description: "Compatible con Excel, Google Sheets y Notion.",
    icon: Table,
  },
  pdf: {
    title: "Generar PDF",
    description: "Resumen legible para compartir con tu equipo.",
    icon: FileText,
  },
  json: {
    title: "Exportar JSON",
    description: "Ideal para integraciones o análisis personalizados.",
    icon: FileJson,
  },
}

const statusBadge: Record<ExportState, { label: string; variant: "secondary" | "outline" | "destructive" }> = {
  idle: { label: "Listo", variant: "secondary" },
  loading: { label: "Generando…", variant: "outline" },
  success: { label: "Exportado", variant: "secondary" },
  error: { label: "Error", variant: "destructive" },
}

export default function TransactionsExportPage() {
  const { toast } = useToast()
  const { statement } = useDemoFinancialData()
  const [states, setStates] = useState<Record<ExportFormat, ExportState>>({
    csv: "idle",
    json: "idle",
    pdf: "idle",
  })

  const range = useMemo(() => (statement ? getStatementDateRange(statement) : null), [statement])
  const totals = statement?.totals

  const handleExport = async (format: ExportFormat) => {
    if (!statement) {
      toast({
        title: "Sin datos disponibles",
        description: "Carga una cartola o inicia la demo para continuar.",
        variant: "destructive",
      })
      return
    }

    setStates((previous) => ({ ...previous, [format]: "loading" }))

    try {
      const exporter = exportActions[format]
      const result = await exporter(statement, DEMO_PERSONAL_DATA, range ?? undefined)
      const blob = new Blob([result.content], { type: result.mimeType })
      const url = URL.createObjectURL(blob)

      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = result.filename
      anchor.rel = "noopener"
      anchor.click()
      anchor.remove()

      URL.revokeObjectURL(url)

      setStates((previous) => ({ ...previous, [format]: "success" }))
      setTimeout(() => {
        setStates((previous) => ({ ...previous, [format]: "idle" }))
      }, 2000)
    } catch (error) {
      console.error(error)
      toast({
        title: "No se pudo exportar",
        description: "Inténtalo de nuevo en unos segundos.",
        variant: "destructive",
      })
      setStates((previous) => ({ ...previous, [format]: "error" }))
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Exportar transacciones</h1>
          <Badge variant="secondary">Demo</Badge>
        </div>
        <p className="max-w-2xl text-muted-foreground">
          Genera extractos personales con tu cartola demo de SalomónAI. Incluimos tus datos de contacto
          ficticios y montos expresados en pesos chilenos (CLP) para que pruebes el flujo completo.
        </p>
      </header>

      {!statement ? (
        <Alert variant="destructive">
          <AlertTitle>No encontramos una cartola para exportar</AlertTitle>
          <AlertDescription>
            Activa el modo demo desde el menú principal o sube tus propios movimientos para habilitar las
            descargas.
          </AlertDescription>
        </Alert>
      ) : null}

      {statement ? (
        <Card className="border-border/70">
          <CardHeader className="space-y-2">
            <CardTitle>Resumen exportable</CardTitle>
            <CardDescription>
              Utilizamos el estado demo chileno para recrear un flujo de descarga de información personal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Titular demo</p>
                <p className="font-semibold">{DEMO_PERSONAL_DATA.fullName}</p>
                <p className="text-sm text-muted-foreground">{DEMO_PERSONAL_DATA.documentId}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Datos de contacto</p>
                <p className="font-semibold">{DEMO_PERSONAL_DATA.email}</p>
                <p className="text-sm text-muted-foreground">{DEMO_PERSONAL_DATA.institution}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Rango disponible</p>
                <p className="font-semibold">
                  {formatDate(range!.start)} — {formatDate(range!.end)}
                </p>
                <p className="text-sm text-muted-foreground">{statement.transactions.length} movimientos</p>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">Balance</p>
                <p className="text-2xl font-semibold">{formatCurrency(totals!.balance)}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">Ingresos</p>
                <p className="text-2xl font-semibold">{formatCurrency(totals!.income)}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">Gastos</p>
                <p className="text-2xl font-semibold">{formatCurrency(totals!.expenses)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        {(Object.keys(exportActions) as ExportFormat[]).map((format) => {
          const { label, variant } = statusBadge[states[format]]
          const { title, description, icon: Icon } = actionLabels[format]

          return (
            <Card key={format} className="border-border/70">
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Icon className="h-5 w-5" /> {title}
                  </CardTitle>
                  <Badge variant={variant}>{label}</Badge>
                </div>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  onClick={() => handleExport(format)}
                  variant="default"
                  disabled={states[format] === "loading"}
                >
                  {states[format] === "loading" ? "Generando archivo…" : title}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </section>
    </div>
  )
}
