import Link from "next/link"
import { Loader2, RefreshCcw, ShieldAlert } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/intl"
import { cn } from "@/lib/utils"
import type { StatementSummary } from "@/services/statements"

const statusVariantMap: Record<string, { label: string; variant: "secondary" | "outline" | "destructive" }> = {
  uploaded: { label: "Subida", variant: "secondary" },
  processing: { label: "Procesando", variant: "outline" },
  processed: { label: "Lista", variant: "secondary" },
  completed: { label: "Lista", variant: "secondary" },
  ready: { label: "Lista", variant: "secondary" },
  failed: { label: "Error", variant: "destructive" },
  error: { label: "Error", variant: "destructive" },
}

const resolveStatusBadge = (status: string) => {
  const normalized = status.toLowerCase()
  return statusVariantMap[normalized] ?? {
    label: status,
    variant: "outline" as const,
  }
}

interface StatementHistoryProps {
  statements: StatementSummary[]
  isLoading?: boolean
  onRefresh?: () => void
}

export function StatementHistory({
  statements,
  isLoading = false,
  onRefresh,
}: StatementHistoryProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-medium">Historial de cartolas</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="text-muted-foreground"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCcw className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          Actualizar
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div data-testid="statement-history-skeleton" className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={`statement-skeleton-${index}`} className="h-12 w-full" />
            ))}
          </div>
        ) : statements.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border/60 bg-muted/40 py-12 text-center">
            <ShieldAlert className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="font-medium text-muted-foreground">Aún no tienes cartolas subidas</p>
              <p className="text-sm text-muted-foreground/80">
                Carga una cartola para comenzar a analizar tus movimientos financieros.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Progreso</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statements.map((statement) => {
                  const statusBadge = resolveStatusBadge(statement.status)
                  const isError = statusBadge.variant === "destructive"

                  return (
                    <TableRow key={statement.id} data-testid={`statement-row-${statement.id}`}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {statement.account?.name ?? "Cuenta sin nombre"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {statement.account?.institution ?? "Institución desconocida"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {statement.periodStart && statement.periodEnd
                          ? `${formatDate(statement.periodStart)} — ${formatDate(statement.periodEnd)}`
                          : "Periodo no disponible"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={statusBadge.variant}
                          className={cn(isError && "uppercase")}
                        >
                          {statusBadge.label}
                        </Badge>
                        {statement.error ? (
                          <p className="mt-1 text-xs text-destructive">{statement.error}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {statement.progress !== null ? `${statement.progress}%` : "Sin datos"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/statements/${statement.id}`}>Ver detalle</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
