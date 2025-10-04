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

const downloadExporters: Record<Exclude<ExportFormat, "pdf">, typeof exportStatementAsCsv> = {
  csv: exportStatementAsCsv,
  json: exportStatementAsJson,
}

const exportFormats: ExportFormat[] = ["csv", "pdf", "json"]

type ExportState = "idle" | "loading" | "success" | "error"

const actionLabels: Record<ExportFormat, { title: string; description: string; icon: typeof FileText }> = {
  csv: {
    title: "Descargar tus registros en CSV",
    description: "Compatible con tus hojas de cálculo en Excel, Google Sheets o Notion.",
    icon: Table,
  },
  pdf: {
    title: "Generar tu resumen en PDF",
    description: "Resumen legible para guardar entre tus registros personales.",
    icon: FileText,
  },
  json: {
    title: "Exportar tus datos en JSON",
    description: "Perfecto para respaldar tus registros o crear tus propios análisis.",
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
        title: "Sin registros disponibles",
        description: "Carga tu cartola o inicia la demo para continuar con tus registros.",
        variant: "destructive",
      })
      return
    }

    setStates((previous) => ({ ...previous, [format]: "loading" }))

    try {
      if (format === "pdf") {
        const result = await exportStatementAsPdf(statement, DEMO_PERSONAL_DATA, range ?? undefined)
        const printWindow = window.open("", "_blank", "noopener,noreferrer")

        if (!printWindow) {
          throw new Error("PDF_PRINT_WINDOW_BLOCKED")
        }

        printWindow.document.write(result.html)
        printWindow.document.close()
      } else {
        const exporter = downloadExporters[format]
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
      }

      setStates((previous) => ({ ...previous, [format]: "success" }))
      setTimeout(() => {
        setStates((previous) => ({ ...previous, [format]: "idle" }))
      }, 2000)
    } catch (error) {
      console.error(error)
      toast({
        title: "No se pudo exportar tus registros",
        description: "Inténtalo de nuevo en unos segundos para completar la descarga.",
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
          Genera tus extractos personales con la cartola demo de SalomónAI. Incluimos tus datos ficticios
          y montos expresados en pesos chilenos (CLP) para que explores todo el flujo con tus registros.
        </p>
      </header>

      {!statement ? (
        <Alert variant="destructive">
          <AlertTitle>No encontramos tus registros para exportar</AlertTitle>
          <AlertDescription>
            Activa el modo demo desde el menú principal o sube tus propios movimientos para habilitar las
            descargas.
          </AlertDescription>
        </Alert>
      ) : null}

      {statement ? (
        <Card className="border-border/70">
          <CardHeader className="space-y-2">
            <CardTitle>Tu resumen exportable</CardTitle>
            <CardDescription>
              Preparamos este resumen demo chileno para mostrarte cómo lucen tus registros antes de
              descargarlos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Tus datos demo</p>
                <p className="font-semibold">{DEMO_PERSONAL_DATA.fullName}</p>
                <p className="text-sm text-muted-foreground">{DEMO_PERSONAL_DATA.documentId}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Tus datos de contacto</p>
                <p className="font-semibold">{DEMO_PERSONAL_DATA.email}</p>
                <p className="text-sm text-muted-foreground">{DEMO_PERSONAL_DATA.institution}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Rango para tu resumen</p>
                <p className="font-semibold">
                  {formatDate(range!.start)} — {formatDate(range!.end)}
                </p>
                <p className="text-sm text-muted-foreground">{statement.transactions.length} movimientos</p>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">Tu balance</p>
                <p className="text-2xl font-semibold">{formatCurrency(totals!.balance)}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">Tus ingresos</p>
                <p className="text-2xl font-semibold">{formatCurrency(totals!.income)}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">Tus gastos</p>
                <p className="text-2xl font-semibold">{formatCurrency(totals!.expenses)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        {exportFormats.map((format) => {
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
