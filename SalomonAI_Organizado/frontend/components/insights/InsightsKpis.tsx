import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InsightKPI } from "@/lib/insights/types";
import { cn } from "@/lib/utils";

const AMOUNT_COLOR: Record<InsightKPI["kind"], string> = {
  ingresos: "text-app-success",
  gastos: "text-app-danger",
  neto: "text-foreground",
};

const DELTA_BG: Record<"positive" | "negative" | "neutral", string> = {
  positive: "bg-[color:color-mix(in_srgb,var(--success)_20%,transparent)] text-app-success",
  negative: "bg-[color:color-mix(in_srgb,var(--danger)_20%,transparent)] text-app-danger",
  neutral: "bg-muted text-muted-foreground",
};

type InsightsKpisProps = {
  kpis: InsightKPI[];
  formatCurrency: (value: number) => string;
  formatPercent: (value: number) => string;
};

export function InsightsKpis({ kpis, formatCurrency, formatPercent }: InsightsKpisProps) {
  if (!kpis.length) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Indicadores clave de ingresos y gastos">
      {kpis.map((kpi) => {
        const amountClassName = AMOUNT_COLOR[kpi.kind];
        const deltaVariant = kpi.delta > 0 ? "positive" : kpi.delta < 0 ? "negative" : "neutral";
        const Icon = kpi.delta > 0 ? ArrowUpRight : kpi.delta < 0 ? ArrowDownRight : Minus;
        const deltaLabel =
          kpi.delta === 0
            ? "Sin variación frente al periodo anterior"
            : `${kpi.delta > 0 ? "+" : "-"}${formatPercent(Math.abs(kpi.delta))}`;

        return (
          <Card
            key={`${kpi.kind}-${kpi.label}`}
            className="rounded-2xl border border-border/60 bg-card shadow-sm"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.label}
              </CardTitle>
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full",
                  DELTA_BG[deltaVariant],
                )}
                aria-hidden
              >
                <Icon className="h-4 w-4" />
              </span>
            </CardHeader>
            <CardContent>
              <p className={cn("text-3xl font-semibold tracking-tight", amountClassName)}>
                {formatCurrency(kpi.amount)}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">{deltaLabel}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
