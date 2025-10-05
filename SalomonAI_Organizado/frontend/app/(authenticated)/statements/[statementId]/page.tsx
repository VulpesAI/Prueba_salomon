"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

import { StatementTransactionsTable } from "@/components/authenticated/statements/statement-transactions-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, formatDate } from "@/lib/intl"
import { useToast } from "@/hooks/use-toast"
import {
  IS_DEMO_MODE,
  useDemoFinancialData,
} from "@/context/DemoFinancialDataContext"
import { buildNormalizedStatementFromApi } from "@/lib/statements/from-api"
import {
  useStatementTransactions,
} from "@/hooks/use-statement-transactions"
import { updateTransaction } from "@/services/statements"

const statusLabels: Record<string, string> = {
  uploaded: "Subida",
  processing: "Procesando",
  processed: "Procesada",
  completed: "Procesada",
  ready: "Procesada",
  failed: "Error",
  error: "Error",
}

const formatStatus = (status: string) => statusLabels[status.toLowerCase()] ?? status

export default function StatementDetailPage() {
  const params = useParams<{ statementId: string }>()
  const statementId = params?.statementId ?? null
  const { updateFromStatement } = useDemoFinancialData()

  const { statement, transactions, normalizedStatement, isLoading, refetch } =
    useStatementTransactions(statementId)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const totals = useMemo(() => {
    if (!normalizedStatement) {
      return null
    }

    return normalizedStatement.totals
  }, [normalizedStatement])

  const handleSave = async (
    changes: Array<{
      transactionId: string
      draft: { description: string; category: string }
    }>
  ) => {
    if (changes.length === 0) {
      return
    }

    setIsSaving(true)

    try {
      let updatedTransactions = transactions

      if (IS_DEMO_MODE) {
        updatedTransactions = transactions.map((transaction) => {
          const change = changes.find((item) => item.transactionId === transaction.id)
          if (!change) {
            return transaction
          }

          return {
            ...transaction,
            description: change.draft.description,
            category: change.draft.category.trim() ? change.draft.category : null,
          }
        })
      } else {
        const responses = [] as Awaited<ReturnType<typeof updateTransaction>>[]

        for (const change of changes) {
          const payload = {
            description: change.draft.description.trim() || null,
            category: change.draft.category.trim() || null,
          }

          const response = await updateTransaction({
            transactionId: change.transactionId,
            payload,
          })

          responses.push(response)
        }

        const merged = new Map(transactions.map((transaction) => [transaction.id, transaction]))

        for (const response of responses) {
          const previous = merged.get(response.id) ?? response
          merged.set(response.id, { ...previous, ...response })
        }

        updatedTransactions = transactions.map((transaction) => merged.get(transaction.id) ?? transaction)

        await refetch()
      }

      if (IS_DEMO_MODE && normalizedStatement) {
        const normalized = buildNormalizedStatementFromApi(updatedTransactions)
        updateFromStatement(normalized)
      }

      toast({
        title: "Cambios guardados",
        description: "Las transacciones fueron actualizadas correctamente.",
      })
    } catch (error) {
      console.error(error)
      toast({
        title: "No pudimos guardar los cambios",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente en unos minutos.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!statement) {
    return (
      <div className="rounded-md border border-dashed border-border/60 bg-muted/40 p-10 text-center">
        <h2 className="text-lg font-semibold">No encontramos esta cartola</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Verifica que el enlace sea correcto o vuelve al listado para intentar nuevamente.
        </p>
        <Button className="mt-6" asChild>
          <Link href="/statements">Volver al historial</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Detalle de cartola</h1>
        <p className="text-muted-foreground">
          Ajusta descripciones y categorías para mejorar tus análisis financieros y alertas.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Información general</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Cuenta</p>
            <p className="font-medium">
              {statement.account?.name ?? "Cuenta sin nombre"}
              {statement.account?.institution ? (
                <span className="ml-2 text-sm text-muted-foreground">
                  ({statement.account.institution})
                </span>
              ) : null}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Periodo</p>
            <p className="font-medium">
              {statement.periodStart && statement.periodEnd
                ? `${formatDate(statement.periodStart)} — ${formatDate(statement.periodEnd)}`
                : "Sin información"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Estado</p>
            <Badge variant="outline">{formatStatus(statement.status)}</Badge>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Progreso</p>
            <p className="font-medium">{statement.progress ?? 0}%</p>
          </div>
          {totals ? (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Totales</p>
              <p className="text-sm text-muted-foreground">
                Balance: <span className="font-medium">{formatCurrency(totals.balance)}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Ingresos: <span className="font-medium">{formatCurrency(totals.income)}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Gastos: <span className="font-medium">{formatCurrency(totals.expenses)}</span>
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <StatementTransactionsTable
        transactions={transactions}
        isSaving={isSaving}
        onSave={handleSave}
      />
    </div>
  )
}
