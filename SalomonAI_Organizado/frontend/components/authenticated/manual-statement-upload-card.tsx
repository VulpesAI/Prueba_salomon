"use client"

import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useRouter } from "next/navigation"
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
import {
  IS_DEMO_MODE,
  useDemoFinancialData,
} from "@/context/DemoFinancialDataContext"
import { useToast } from "@/hooks/use-toast"
import { buildNormalizedStatementFromApi } from "@/lib/statements/from-api"
import {
  getStatementTransactions,
  getStatements,
  type StatementSummary,
} from "@/services/statements"
import { api } from "@/lib/api-client"

interface ManualStatementUploadCardProps {
  className?: string
  onStatementParsed?: (statement: NormalizedStatement) => void
}

interface UploadState {
  isLoading: boolean
  error: string | null
  statement: NormalizedStatement | null
}

const doneStatuses = new Set(["processed", "completed", "ready"])
const errorStatuses = new Set(["failed", "error"])

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
  const [progress, setProgress] = useState<{
    status: string
    progress: number | null
  } | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()
  const { toast } = useToast()
  const { updateFromStatement } = useDemoFinancialData()

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    setSelectedFiles(files)
    setState((prev) => ({ ...prev, error: null, statement: null }))
    setProgress(null)
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

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  useEffect(() => () => stopPolling(), [stopPolling])

  const handlePollingCompletion = useCallback(
    async (statement: StatementSummary) => {
      try {
        const detail = await getStatementTransactions(statement.id)
        const normalized = buildNormalizedStatementFromApi(detail.transactions)
        setState({ isLoading: false, error: null, statement: normalized })
        setSelectedFiles([])
        setProgress(null)
        onStatementParsed?.(normalized)
        if (IS_DEMO_MODE) {
          updateFromStatement(normalized)
        }
        toast({
          title: "Cartola procesada",
          description: "Tus movimientos están listos para revisión.",
        })
        router.push(`/statements/${statement.id}`)
      } catch (error) {
        console.error(error)
        setState({
          isLoading: false,
          error: "No pudimos obtener el detalle de la cartola.",
          statement: null,
        })
        setProgress(null)
        toast({
          title: "No pudimos cargar el detalle",
          description:
            error instanceof Error ? error.message : "Intenta nuevamente en unos minutos.",
          variant: "destructive",
        })
      }
    },
    [onStatementParsed, router, toast, updateFromStatement]
  )

  const startPolling = useCallback(
    (statementId: string) => {
      stopPolling()

      pollingRef.current = setInterval(async () => {
        try {
          const statements = await getStatements()
          const target = statements.find((item) => item.id === statementId)
          if (!target) {
            return
          }

          setProgress({
            status: target.status,
            progress: target.progress ?? null,
          })

          const normalizedStatus = target.status.toLowerCase()

          if (doneStatuses.has(normalizedStatus) || (target.progress ?? 0) >= 100) {
            stopPolling()
            await handlePollingCompletion(target)
          } else if (errorStatuses.has(normalizedStatus)) {
            stopPolling()
            setState({
              isLoading: false,
              error: target.error ?? "Ocurrió un error al procesar la cartola.",
              statement: null,
            })
            setProgress(null)
            toast({
              title: "Error al procesar la cartola",
              description: target.error ?? "Revisa el archivo e inténtalo nuevamente.",
              variant: "destructive",
            })
          }
        } catch (error) {
          console.error(error)
        }
      }, 3500) as unknown as NodeJS.Timeout
    },
    [handlePollingCompletion, stopPolling, toast]
  )

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    stopPolling()
    setProgress(null)
    setState({ isLoading: true, error: null, statement: null })

    try {
      if (IS_DEMO_MODE) {
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
        setSelectedFiles([])
        onStatementParsed?.(data.statement)
        updateFromStatement(data.statement)
        toast({
          title: "Cartola lista",
          description: "La cartola demo fue procesada correctamente.",
        })
        return
      }

      const formData = new FormData()
      selectedFiles.forEach((file) => {
        formData.append("file", file)
      })

      const response = await api.post<{ statement: StatementSummary }>(
        "/api/v1/statements",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      )

      const { statement } = response.data
      setProgress({ status: statement.status, progress: statement.progress ?? 0 })
      toast({
        title: "Archivo recibido",
        description: "Estamos procesando los movimientos. Esto puede tomar unos segundos.",
      })
      startPolling(statement.id)
    } catch (error) {
      setState({
        isLoading: false,
        error: error instanceof Error ? error.message : "Ocurrió un error inesperado",
        statement: null,
      })
      setProgress(null)
      toast({
        title: "No pudimos cargar la cartola",
        description: error instanceof Error ? error.message : "Revisa el archivo e inténtalo nuevamente.",
        variant: "destructive",
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
        {progress && (
          <p className="text-sm text-muted-foreground">
            Estado: <span className="font-medium capitalize">{progress.status}</span>
            {typeof progress.progress === "number" ? ` — ${progress.progress}%` : null}
          </p>
        )}
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
