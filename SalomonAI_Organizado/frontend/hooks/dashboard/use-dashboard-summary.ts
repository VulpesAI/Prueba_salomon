"use client"

import { useMemo } from "react"

import { queryKeys } from "@/config/query-keys"
import { useApiQuery } from "@/hooks/use-api"
import { getDashboardSummary } from "@/services/dashboard"
import type { DashboardSummaryResponse } from "@/types/dashboard"

type UseDashboardSummaryOptions = {
  userId: string | null
  accountId?: string
  startDate?: string
  endDate?: string
  granularity?: "day" | "week" | "month"
  maxCategories?: number
  currency?: string
}

export const useDashboardSummary = ({
  userId,
  accountId,
  startDate,
  endDate,
  granularity,
  maxCategories,
  currency,
}: UseDashboardSummaryOptions) => {
  const summaryQuery = useApiQuery<DashboardSummaryResponse, Error>({
    queryKey: userId
      ? queryKeys.dashboard.summary({
          userId,
          accountId: accountId ?? null,
          startDate: startDate ?? null,
          endDate: endDate ?? null,
          granularity: granularity ?? null,
          maxCategories: maxCategories ?? null,
        })
      : ["dashboard", "summary", "anonymous"],
    queryFn: (_, context) =>
      getDashboardSummary(
        {
          userId: userId!,
          accountId,
          startDate,
          endDate,
          granularity,
          maxCategories,
          currency,
        },
        { signal: context.signal }
      ),
    enabled: Boolean(userId),
    staleTime: 60_000,
  })

  return {
    summary: summaryQuery.data ?? null,
    isLoading: summaryQuery.isPending || summaryQuery.isFetching,
    error: summaryQuery.error?.message ?? null,
    refresh: summaryQuery.refetch,
  }
}

