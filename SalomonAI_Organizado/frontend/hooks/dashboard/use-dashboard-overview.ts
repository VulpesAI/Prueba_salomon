"use client"

import { useMemo } from "react"

import { queryKeys } from "@/config/query-keys"
import { useAuth } from "@/context/AuthContext"
import { useApiQuery } from "@/hooks/use-api"
import { getDashboardOverview } from "@/services/dashboard"
import type { DashboardOverviewResponse } from "@/types/dashboard"

type OverviewQueryResult = DashboardOverviewResponse | undefined

export const useDashboardOverview = () => {
  const { session, isLoading: isAuthLoading, isAuthDisabled } = useAuth()

  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000",
    []
  )

  const overviewQuery = useApiQuery<DashboardOverviewResponse, Error, OverviewQueryResult>({
    queryKey: queryKeys.dashboard.overview(),
    queryFn: (_, context) => getDashboardOverview({ signal: context.signal }),
    enabled: Boolean(session?.accessToken) || isAuthDisabled,
    staleTime: 60_000,
  })

  const overview = overviewQuery.data

  const errorMessage = overviewQuery.error
    ? overviewQuery.error.message || "No pudimos cargar el resumen financiero."
    : null

  const hasAccessToken = Boolean(session?.accessToken)
  const isQueryEnabled = hasAccessToken || isAuthDisabled
  const isLoading =
    (!isAuthDisabled && isAuthLoading) ||
    (isQueryEnabled ? overviewQuery.isPending || overviewQuery.isFetching : false)

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
