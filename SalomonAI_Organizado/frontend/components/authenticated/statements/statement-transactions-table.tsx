"use client";

import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatDate } from "@/lib/intl"
import type { StatementTransaction } from "@/services/statements"

interface DraftTransaction {
  description: string
  category: string
}

export interface StatementTransactionsTableProps {
  transactions: StatementTransaction[]
  isSaving?: boolean
  onSave: (changes: Array<{ transactionId: string; draft: DraftTransaction }>) => void
}

const normalize = (value: string | null | undefined) => value?.trim() ?? ""

export function StatementTransactionsTable({
  transactions,
  isSaving = false,
  onSave,
}: StatementTransactionsTableProps) {
  const [drafts, setDrafts] = useState<Record<string, DraftTransaction>>({})

  useEffect(() => {
    const nextDrafts: Record<string, DraftTransaction> = {}

    for (const transaction of transactions) {
      nextDrafts[transaction.id] = {
        description: normalize(transaction.description),
        category: normalize(transaction.category ?? transaction.merchant),
      }
    }

    setDrafts(nextDrafts)
  }, [transactions])

  const dirtyTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const draft = drafts[transaction.id]
      if (!draft) return false

      return (
        normalize(transaction.description) !== draft.description ||
        normalize(transaction.category ?? transaction.merchant) !== draft.category
      )
    })
  }, [drafts, transactions])

  const handleDraftChange = (
    transactionId: string,
    field: keyof DraftTransaction,
    value: string
  ) => {
    setDrafts((previous) => ({
      ...previous,
      [transactionId]: {
        ...previous[transactionId],
        [field]: value,
      },
    }))
  }

  const handleSave = () => {
    const changes = dirtyTransactions.map((transaction) => ({
      transactionId: transaction.id,
      draft: drafts[transaction.id],
    }))

    onSave(changes)
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border/60 bg-muted/40 p-8 text-center text-sm text-muted-foreground">
        No se encontraron movimientos asociados a esta cartola.
      </div>
    )
  }

  return (
    <div className="space-y-4" data-testid="transactions-table">
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Fecha</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="w-[220px]">Categoría</TableHead>
              <TableHead className="w-[140px] text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => {
              const draft = drafts[transaction.id] ?? {
                description: "",
                category: "",
              }

              return (
                <TableRow key={transaction.id} data-testid={`transaction-row-${transaction.id}`}>
                  <TableCell className="text-sm text-muted-foreground">
                    {transaction.postedAt ? formatDate(transaction.postedAt) : "Sin fecha"}
                  </TableCell>
                  <TableCell>
                    <Input
                      value={draft.description}
                      onChange={(event) =>
                        handleDraftChange(transaction.id, "description", event.target.value)
                      }
                      aria-label={`Descripción ${transaction.id}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={draft.category}
                      onChange={(event) =>
                        handleDraftChange(transaction.id, "category", event.target.value)
                      }
                      aria-label={`Categoría ${transaction.id}`}
                    />
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {typeof transaction.amount === "number"
                      ? formatCurrency(transaction.amount)
                      : "—"}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-3">
        <span className="text-sm text-muted-foreground">
          {dirtyTransactions.length === 0
            ? "No hay cambios pendientes"
            : `${dirtyTransactions.length} movimiento${dirtyTransactions.length > 1 ? "s" : ""} por guardar`}
        </span>
        <Button
          type="button"
          onClick={handleSave}
          disabled={dirtyTransactions.length === 0 || isSaving}
          data-testid="save-transactions-button"
        >
          {isSaving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </div>
  )
}
