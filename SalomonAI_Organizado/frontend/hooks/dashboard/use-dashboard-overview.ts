"use client"

import { useMemo } from "react"

import { queryKeys } from "@/config/query-keys"
import { useAuth } from "@/context/AuthContext"
import { useApiQuery } from "@/hooks/use-api-query"
import {
  type AccountSummary,
  type CategoryBreakdown,
  type DashboardOverviewResponse,
  type OverviewTotals,
  type TransactionSummary,
  getDashboardOverview,
} from "@/services/dashboard"

export type { OverviewTotals, AccountSummary, TransactionSummary, CategoryBreakdown }

export const useDashboardOverview = () => {
  const { user } = useAuth()
  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000",
    []
  )

  const isAuthenticated = Boolean(user)

  const query = useApiQuery<DashboardOverviewResponse>({
    queryKey: queryKeys.dashboard.overview,
    queryFn: (client) => getDashboardOverview(client),
    enabled: isAuthenticated,
    keepPreviousData: true,
    staleTime: 60_000,
  })

  const data = query.data

  const errorMessage = query.error
    ? query.error instanceof Error
      ? query.error.message
      : "No pudimos cargar el resumen financiero."
    : null

  return {
    totals: data?.totals ?? null,
    accounts: data?.accounts ?? [],
    recentTransactions: data?.recentTransactions ?? [],
    categoryBreakdown: data?.categoryBreakdown ?? [],
    isLoading: isAuthenticated ? query.isPending : false,
    isFetching: query.isFetching,
    error: errorMessage,
    refresh: query.refetch,
    apiBaseUrl,
  }
}
