"use client";

import { useMemo, useState } from "react";

import { CategoriesDonut } from "@/components/dashboard/CategoriesDonut";
import { FluxPanel } from "@/components/dashboard/FluxPanel";
import { Insights } from "@/components/dashboard/Insights";
import { ChartSkeleton, ErrorState, KpiSkeleton } from "@/components/dashboard/Skeletons";
import { KpiStrip } from "@/components/dashboard/KpiStrip";
import type { CategoryItem } from "@/hooks/useDashboardOverview";
import { useDashboardOverview } from "@/hooks/useDashboardOverview";

function sortCategories(items: CategoryItem[]) {
  return [...items].sort((a, b) => b.amount - a.amount);
}

export default function OverviewPage() {
  const [range, setRange] = useState<"7" | "30" | "90">("30");
  const { data, isLoading, isError, refetch, isFetching } = useDashboardOverview(range);

  const categories = useMemo(() => (data ? sortCategories(data.categories) : []), [data]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <KpiSkeleton key={index} />
          ))}
        </div>
        <ChartSkeleton />
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-6" aria-busy={isFetching}>
      <KpiStrip kpis={data.kpis} />
      <FluxPanel data={data.flux} range={range} onRangeChange={setRange} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <CategoriesDonut data={categories} />
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Insights accionables</h3>
              <p className="text-xs text-muted-foreground">Recomendaciones del motor de IA.</p>
            </div>
          </div>
          <div className="mt-4">
            <Insights items={data.insights} />
          </div>
        </div>
      </div>
    </div>
  );
}
