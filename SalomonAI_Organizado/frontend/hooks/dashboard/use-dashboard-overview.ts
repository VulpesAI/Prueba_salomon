"use client"

import { useMemo } from "react"

import { queryKeys } from "@/config/query-keys"
import { ENV } from "@/config/env"
import { useApiQuery } from "@/hooks/use-api"
import { getDashboardOverview } from "@/services/dashboard"
import type { DashboardOverviewResponse } from "@/types/dashboard"
import {
  IS_DEMO_MODE,
  useDemoFinancialData,
} from "@/context/DemoFinancialDataContext"

type OverviewQueryResult = DashboardOverviewResponse | undefined

export const useDashboardOverview = () => {
  const { overview } = useDemoFinancialData()
  const hasLocalOverview = Boolean(overview)
  const isDemoMode = IS_DEMO_MODE

  const apiBaseUrl = useMemo(
    () => ENV.NEXT_PUBLIC_API_URL || "http://localhost:3000",
    []
  )

  const overviewQuery = useApiQuery<DashboardOverviewResponse, Error, OverviewQueryResult>({
    queryKey: queryKeys.dashboard.overview(),
    queryFn: (_, context) => getDashboardOverview({ signal: context.signal }),
    staleTime: 60_000,
    enabled: !isDemoMode && !hasLocalOverview,
    initialData: overview ?? undefined,
  })

  const overviewData = overview ?? overviewQuery.data

  const errorMessage = isDemoMode
    ? null
    : hasLocalOverview
      ? null
      : overviewQuery.error
        ? overviewQuery.error.message || "No pudimos cargar el resumen financiero."
        : null

  const isLoading = isDemoMode
    ? false
    : hasLocalOverview
      ? false
      : overviewQuery.isPending || overviewQuery.isFetching

  const refresh = isDemoMode
    ? async () => undefined
    : overviewQuery.refetch

  return {
    totals: overviewData?.totals ?? null,
    accounts: overviewData?.accounts ?? [],
    recentTransactions: overviewData?.recentTransactions ?? [],
    categoryBreakdown: overviewData?.categoryBreakdown ?? [],
    isLoading,
    error: errorMessage,
    refresh,
    apiBaseUrl,
  }
}
