"use client"

import { useMemo } from "react"

import { queryKeys } from "@/config/query-keys"
import { useApiQuery } from "@/hooks/use-api"
import { getDashboardOverview } from "@/services/dashboard"
import type { DashboardOverviewResponse } from "@/types/dashboard"

type OverviewQueryResult = DashboardOverviewResponse | undefined

export const useDashboardOverview = () => {
  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000",
    []
  )

  const overviewQuery = useApiQuery<DashboardOverviewResponse, Error, OverviewQueryResult>({
    queryKey: queryKeys.dashboard.overview(),
    queryFn: (_, context) => getDashboardOverview({ signal: context.signal }),
    staleTime: 60_000,
  })

  const overview = overviewQuery.data

  const errorMessage = overviewQuery.error
    ? overviewQuery.error.message || "No pudimos cargar el resumen financiero."
    : null

  const isLoading = overviewQuery.isPending || overviewQuery.isFetching

  return {
    totals: overview?.totals ?? null,
    accounts: overview?.accounts ?? [],
    recentTransactions: overview?.recentTransactions ?? [],
    categoryBreakdown: overview?.categoryBreakdown ?? [],
    isLoading,
    error: errorMessage,
    refresh: overviewQuery.refetch,
    apiBaseUrl,
  }
}
