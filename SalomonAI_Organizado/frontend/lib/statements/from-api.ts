import type { StatementSummary, StatementTransaction } from "@/services/statements"

import type { NormalizedStatement, NormalizedTransaction } from "./parser"

const DEFAULT_CATEGORY = "Sin categoría"

const normalizeDate = (value: string | null): string => {
  if (!value) {
    return new Date().toISOString().slice(0, 10)
  }

  return value.slice(0, 10)
}

const toNormalizedTransaction = (
  transaction: StatementTransaction
): NormalizedTransaction => {
  const amount = Number.isFinite(transaction.amount)
    ? (transaction.amount as number)
    : 0

  const category = transaction.category?.trim()

  return {
    date: normalizeDate(transaction.postedAt),
    description: transaction.description ?? "",
    amount,
    category: category && category.length > 0 ? category : undefined,
    metadata: {
      currency: transaction.currency ?? undefined,
      merchant: transaction.merchant ?? undefined,
      transactionId: transaction.id,
    },
  }
}

export const buildNormalizedStatementFromApi = (
  transactions: StatementTransaction[]
): NormalizedStatement => {
  const normalizedTransactions = transactions.map(toNormalizedTransaction)

  const totals = normalizedTransactions.reduce(
    (acc, transaction) => {
      if (!Number.isFinite(transaction.amount)) {
        return acc
      }

      const amount = transaction.amount

      acc.balance += amount

      if (amount >= 0) {
        acc.income += amount
      } else {
        acc.expenses += Math.abs(amount)
      }

      const category = transaction.category ?? DEFAULT_CATEGORY

      if (amount >= 0) {
        acc.incomeByCategory[category] =
          (acc.incomeByCategory[category] ?? 0) + amount
      } else {
        acc.expenseByCategory[category] =
          (acc.expenseByCategory[category] ?? 0) + Math.abs(amount)
      }

      return acc
    },
    {
      balance: 0,
      income: 0,
      expenses: 0,
      incomeByCategory: {} as Record<string, number>,
      expenseByCategory: {} as Record<string, number>,
    }
  )

  return {
    transactions: normalizedTransactions,
    totals: {
      balance: totals.balance,
      income: totals.income,
      expenses: totals.expenses,
    },
    incomeByCategory: totals.incomeByCategory,
    expenseByCategory: totals.expenseByCategory,
  }
}

export const buildStatementSummaryFromNormalized = (
  statement: NormalizedStatement,
  overrides: Partial<StatementSummary> = {}
): StatementSummary => {
  const totals = statement.transactions.reduce(
    (acc, transaction) => {
      acc.count += 1
      acc.total += transaction.amount
      return acc
    },
    { count: 0, total: 0 }
  )

  return {
    id: "demo-statement",
    status: "processed",
    progress: 100,
    error: null,
    storagePath: "demo/local",
    uploadedAt: new Date().toISOString(),
    periodStart: statement.transactions[statement.transactions.length - 1]?.date ?? null,
    periodEnd: statement.transactions[0]?.date ?? null,
    checksum: `${totals.count}:${totals.total}`,
    account: overrides.account ?? null,
    ...overrides,
  }
}
