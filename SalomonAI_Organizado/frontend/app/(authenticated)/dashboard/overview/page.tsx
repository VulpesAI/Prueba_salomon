"use client"

import { useMemo, useState } from "react"

import { ChatFab } from "@/components/assistant/chat-fab"
import { CashflowChart } from "@/components/dashboard/cashflow-chart"
import { InsightsList } from "@/components/dashboard/insights-list"
import { KpiStrip } from "@/components/dashboard/kpi-strip"
import { ChartSkeleton, DonutSkeleton, ErrorState, InsightsSkeleton, KpiSkeleton } from "@/components/dashboard/skeletons"
import { TopCategoriesDonut } from "@/components/dashboard/top-categories-donut"
import type { CategoryItem } from "@/hooks/useDashboardOverview"
import { useDashboardOverview } from "@/hooks/useDashboardOverview"

function sortCategories(items: CategoryItem[]) {
  return [...items].sort((a, b) => b.amount - a.amount)
}

export default function OverviewPage() {
  const [range, setRange] = useState<"7" | "30" | "90">("30")
  const { data, isLoading, isError, refetch, isFetching } = useDashboardOverview(range)

  const categories = useMemo(() => (data ? sortCategories(data.categories) : []), [data])

  if (isLoading) {
    return (
      <div className="space-y-6 md:space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <KpiSkeleton key={`kpi-skeleton-${index}`} />
          ))}
        </div>
        <ChartSkeleton />
        <div className="grid gap-6 md:gap-8 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <DonutSkeleton />
          </div>
          <div className="xl:col-span-5">
            <InsightsSkeleton />
          </div>
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return <ErrorState onRetry={() => void refetch()} />
  }

    return (
      <>
        <div className="space-y-8 md:space-y-10" aria-busy={isFetching}>
          <KpiStrip kpis={data.kpis} />
          <CashflowChart data={data.flux} range={range} onRangeChange={setRange} />
          <div className="grid gap-6 md:gap-8 xl:grid-cols-12">
            <div className="xl:col-span-7">
              <TopCategoriesDonut data={categories} range={range} />
            </div>
            <div className="xl:col-span-5">
              <InsightsList items={data.insights} />
            </div>
          </div>
        </div>
        <ChatFab />
      </>
    )
}
