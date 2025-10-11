"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { InsightTrend } from "@/lib/insights/types";
import { CATEGORY_COLORS, getCategoryColor } from "@/lib/ui/palette";

function CategoriesTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0];
  const category = String(item.name ?? item.dataKey ?? "");
  const color = getCategoryColor(category);
  const amount = Number(item.value ?? 0);
  const pct = Number(item.payload?.pct ?? 0);
  const percentFormatter = new Intl.NumberFormat("es-CL", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const currencyFormatter = new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  });

  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-lg"
      style={{
        background: "hsl(var(--card))",
        borderColor: "hsl(var(--border))",
        color: "hsl(var(--foreground))",
      }}
    >
      <div className="flex items-center gap-2 font-medium" style={{ color }}>
        <span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        {category}
      </div>
      <div className="mt-1 space-y-0.5 text-muted-foreground">
        <div className="flex items-center justify-between gap-4">
          <span>Monto</span>
          <span className="font-medium text-foreground">
            {currencyFormatter.format(amount)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Participación</span>
          <span className="font-medium text-foreground">{percentFormatter.format(pct)}</span>
        </div>
      </div>
    </div>
  );
}

type TopCategoriesChartProps = {
  data: InsightTrend[];
  formatCurrency: (value: number) => string;
  formatPercent: (value: number) => string;
};

export function TopCategoriesChart({ data, formatCurrency, formatPercent }: TopCategoriesChartProps) {
  if (!data.length) {
    return null;
  }

  const total = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Card className="rounded-2xl border border-border/60 bg-card shadow-sm" aria-labelledby="top-categories-heading">
      <CardHeader>
        <CardTitle id="top-categories-heading">Categorías destacadas</CardTitle>
        <CardDescription>
          Visualiza en qué categorías has concentrado tus gastos durante el periodo seleccionado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div
            className="mx-auto h-64 w-full max-w-[280px]"
            role="img"
            aria-label="Distribución porcentual de las principales categorías"
            aria-describedby="top-categories-caption"
          >
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="amount"
                  nameKey="category"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={4}
                >
                  {data.map((entry) => {
                    const color = CATEGORY_COLORS[entry.category] ?? getCategoryColor(entry.category);
                    return <Cell key={entry.category} fill={color} stroke="transparent" />;
                  })}
                </Pie>
                <Tooltip
                  content={<CategoriesTooltip />}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "0.75rem",
                    color: "hsl(var(--foreground))",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                  wrapperStyle={{ outline: "none" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-4" id="top-categories-caption" role="list">
            {data.map((item) => {
              const color = CATEGORY_COLORS[item.category] ?? getCategoryColor(item.category);
              const share = total > 0 ? Math.round((item.amount / total) * 100) : 0;
              return (
                <div key={item.category} className="space-y-2" role="listitem">
                  <div className="flex items-center justify-between gap-4 text-sm font-medium text-foreground">
                    <span className="inline-flex items-center gap-2">
                      <span
                        aria-hidden
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      {item.category}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatPercent(item.pct)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3" role="presentation">
                    <div className="h-2 flex-1 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${share}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium tabular-nums text-foreground">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
