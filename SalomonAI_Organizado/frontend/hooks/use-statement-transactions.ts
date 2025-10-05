"use client"

import { useMemo } from "react"

import { queryKeys } from "@/config/query-keys"
import {
  IS_DEMO_MODE,
  useDemoFinancialData,
} from "@/context/DemoFinancialDataContext"
import { useApiQuery } from "@/hooks/use-api"
import {
  buildNormalizedStatementFromApi,
  buildStatementSummaryFromNormalized,
} from "@/lib/statements/from-api"
import {
  getStatementTransactions,
  type StatementSummary,
  type StatementTransaction,
} from "@/services/statements"

type StatementTransactionsResult = {
  statement: StatementSummary | null
  transactions: StatementTransaction[]
  normalizedStatement: ReturnType<typeof buildNormalizedStatementFromApi> | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export const useStatementTransactions = (
  statementId: string | null
): StatementTransactionsResult => {
  const { statement: demoStatement } = useDemoFinancialData()

  const transactionsQuery = useApiQuery({
    queryKey: queryKeys.statements.transactions(statementId ?? ""),
    queryFn: async (_client, context) => {
      if (!statementId) {
        return null
      }

      return getStatementTransactions(statementId, { signal: context.signal })
    },
    enabled: Boolean(statementId) && !IS_DEMO_MODE,
  })

  const detail = useMemo(() => {
    if (IS_DEMO_MODE) {
      if (!demoStatement) {
        return {
          statement: null,
          transactions: [],
          normalized: null,
        }
      }

      const transactions = demoStatement.transactions.map((transaction, index) => ({
        id: `demo-${index}`,
        postedAt: transaction.date,
        description: transaction.description,
        amount: transaction.amount,
        currency: "CLP",
        merchant: transaction.metadata?.merchant ?? null,
        category: transaction.category ?? null,
      })) satisfies StatementTransaction[]

      const normalized = buildNormalizedStatementFromApi(transactions)
      const summary = buildStatementSummaryFromNormalized(normalized)

      return {
        statement: summary,
        transactions,
        normalized,
      }
    }

    if (!transactionsQuery.data) {
      return {
        statement: null,
        transactions: [] as StatementTransaction[],
        normalized: null,
      }
    }

    const normalized = buildNormalizedStatementFromApi(transactionsQuery.data.transactions)

    return {
      statement: transactionsQuery.data.statement,
      transactions: transactionsQuery.data.transactions,
      normalized,
    }
  }, [demoStatement, transactionsQuery.data])

  return {
    statement: detail.statement,
    transactions: detail.transactions,
    normalizedStatement: detail.normalized,
    isLoading: IS_DEMO_MODE ? false : transactionsQuery.isPending,
    error: transactionsQuery.error ?? null,
    refetch: async () => {
      if (IS_DEMO_MODE || !statementId) {
        return
      }

      await transactionsQuery.refetch()
    },
  }
}
