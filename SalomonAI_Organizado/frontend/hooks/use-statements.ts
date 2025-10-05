"use client"

import { useMemo } from "react"

import { queryKeys } from "@/config/query-keys"
import {
  IS_DEMO_MODE,
  useDemoFinancialData,
} from "@/context/DemoFinancialDataContext"
import { useApiQuery } from "@/hooks/use-api"
import {
  buildStatementSummaryFromNormalized,
} from "@/lib/statements/from-api"
import { getStatements, type StatementSummary } from "@/services/statements"

type UseStatementsResult = {
  statements: StatementSummary[]
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<StatementSummary[] | undefined>
}

export const useStatements = (): UseStatementsResult => {
  const { statement } = useDemoFinancialData()

  const statementsQuery = useApiQuery<StatementSummary[], Error>({
    queryKey: queryKeys.statements.list(),
    queryFn: async (_client, context) => getStatements({ signal: context.signal }),
    enabled: !IS_DEMO_MODE,
    staleTime: 30_000,
  })

  const statements = useMemo(() => {
    if (IS_DEMO_MODE) {
      if (!statement) {
        return []
      }

      return [buildStatementSummaryFromNormalized(statement)]
    }

    return statementsQuery.data ?? []
  }, [statement, statementsQuery.data])

  return {
    statements,
    isLoading: IS_DEMO_MODE ? false : statementsQuery.isPending,
    error: statementsQuery.error ?? null,
    refetch: async () => {
      if (IS_DEMO_MODE) {
        return statements
      }

      const result = await statementsQuery.refetch()
      return result.data
    },
  }
}
