"use client"

import { type ChangeEvent, useMemo, useState } from "react"
import { Loader2, UploadCloud } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { type NormalizedStatement } from "@/lib/statements/parser"
import { cn } from "@/lib/utils"

interface ManualStatementUploadCardProps {
  className?: string
  onStatementParsed?: (statement: NormalizedStatement) => void
}

interface UploadState {
  isLoading: boolean
  error: string | null
  statement: NormalizedStatement | null
}

export function ManualStatementUploadCard({
  className,
  onStatementParsed,
}: ManualStatementUploadCardProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [state, setState] = useState<UploadState>({
    isLoading: false,
    error: null,
    statement: null,
  })

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    setSelectedFiles(files)
    setState((prev) => ({ ...prev, error: null, statement: null }))
  }

  const fileSummary = useMemo(() => {
    if (selectedFiles.length === 0) {
      return "Ningún archivo seleccionado aún."
    }

    return `${selectedFiles.length} archivo${selectedFiles.length > 1 ? "s" : ""} listo${
      selectedFiles.length > 1 ? "s" : ""
    } para analizar.`
  }, [selectedFiles])

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(value)

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    setState({ isLoading: true, error: null, statement: null })

    try {
      const formData = new FormData()
      selectedFiles.forEach((file) => {
        formData.append("files", file)
      })

      const response = await fetch("/api/demo/statements", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error ?? "No se pudo procesar la cartola")
      }

      const data = (await response.json()) as { statement: NormalizedStatement }
      setState({ isLoading: false, error: null, statement: data.statement })
      onStatementParsed?.(data.statement)
    } catch (error) {
      setState({
        isLoading: false,
        error: error instanceof Error ? error.message : "Ocurrió un error inesperado",
        statement: null,
      })
    }
  }

  const { isLoading, error, statement } = state

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Carga de cartolas bancarias</CardTitle>
        <CardDescription>
          Sube manualmente archivos PDF o CSV para analizarlos y conciliar movimientos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Input
            type="file"
            multiple
            accept=".pdf,.csv"
            onChange={handleFileChange}
            aria-label="Seleccionar cartolas bancarias en formato PDF o CSV"
          />
          <p className="mt-2 text-sm text-muted-foreground">{fileSummary}</p>
        </div>
        {selectedFiles.length > 0 && (
          <ul className="space-y-2 text-sm">
            {selectedFiles.map((file) => (
              <li key={file.name} className="flex items-center justify-between rounded-md border px-3 py-2">
                <span className="truncate" title={file.name}>
                  {file.name}
                </span>
                <span className="ml-4 shrink-0 text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-2">
        <Button type="button" disabled={selectedFiles.length === 0 || isLoading} onClick={handleUpload}>
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Procesando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <UploadCloud className="h-4 w-4" aria-hidden="true" />
              Iniciar análisis
            </span>
          )}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {statement && (
          <div className="w-full rounded-md bg-muted p-3 text-sm">
            <p className="font-semibold">Resumen generado</p>
            <ul className="mt-2 space-y-1">
              <li>
                <span className="text-muted-foreground">Balance:</span> {formatCurrency(statement.totals.balance)}
              </li>
              <li>
                <span className="text-muted-foreground">Ingresos:</span> {formatCurrency(statement.totals.income)}
              </li>
              <li>
                <span className="text-muted-foreground">Gastos:</span> {formatCurrency(statement.totals.expenses)}
              </li>
            </ul>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
