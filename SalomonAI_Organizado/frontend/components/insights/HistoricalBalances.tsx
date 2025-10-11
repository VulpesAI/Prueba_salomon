"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { InsightHistory } from "@/lib/insights/types";
import { ACCOUNT_COLOR_VARS, colorFromVar } from "@/lib/ui/account-colors";

const SERIES_LABELS: Record<keyof typeof ACCOUNT_COLOR_VARS, string> = {
  checking: "Cuenta corriente",
  savings: "Ahorro",
  credit: "Crédito",
  investment: "Inversión",
};

type HistoricalBalancesProps = {
  data: InsightHistory[];
  formatCurrency: (value: number) => string;
  formatDateLabel: (value: string) => string;
};

type TooltipWithFormatterProps = TooltipProps<number, string> & {
  formatCurrency: (value: number) => string;
};

function BalancesTooltip({ active, payload, label, formatCurrency }: TooltipWithFormatterProps) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-lg"
      style={{
        background: "hsl(var(--card))",
        borderColor: "hsl(var(--border))",
        color: "hsl(var(--foreground))",
      }}
    >
      <div className="mb-2 font-medium">{label}</div>
      <div className="space-y-1 text-muted-foreground">
        {payload.map((item) => {
          const key = item.dataKey as keyof typeof ACCOUNT_COLOR_VARS;
          const color = colorFromVar(ACCOUNT_COLOR_VARS[key]);
          const rawValue = Number(item.value ?? 0);
          return (
            <div key={key} className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                {SERIES_LABELS[key]}
              </span>
              <span className="tabular-nums text-foreground">{formatCurrency(rawValue)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function HistoricalBalances({ data, formatCurrency, formatDateLabel }: HistoricalBalancesProps) {
  if (!data.length) {
    return null;
  }

  const yAxisFormatter = new Intl.NumberFormat("es-CL", {
    notation: "compact",
    maximumFractionDigits: 1,
  });

  const tooltipRenderer = (props: TooltipProps<number, string>) => (
    <BalancesTooltip {...props} formatCurrency={formatCurrency} />
  );

  return (
    <Card className="rounded-2xl border border-border/60 bg-card shadow-sm" aria-labelledby="historical-balances-heading">
      <CardHeader>
        <CardTitle id="historical-balances-heading">Saldos históricos</CardTitle>
        <CardDescription>
          Evolución de tus cuentas corrientes, ahorros, líneas de crédito e inversiones.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[320px] w-full" role="img" aria-label="Saldos diarios por tipo de cuenta">
          <ResponsiveContainer>
            <AreaChart
              data={data.map((point) => ({
                ...point,
                formattedDate: formatDateLabel(point.x),
              }))}
              margin={{ top: 10, right: 16, left: 16, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="4 4" className="stroke-border/40" />
              <XAxis
                dataKey="formattedDate"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(value) => yAxisFormatter.format(Number(value))}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={tooltipRenderer}
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
              <Legend />
              <Area
                type="monotone"
                dataKey="checking"
                name={SERIES_LABELS.checking}
                stroke={colorFromVar(ACCOUNT_COLOR_VARS.checking)}
                fill={colorFromVar(ACCOUNT_COLOR_VARS.checking)}
                fillOpacity={0.2}
                strokeWidth={2}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="savings"
                name={SERIES_LABELS.savings}
                stroke={colorFromVar(ACCOUNT_COLOR_VARS.savings)}
                fill={colorFromVar(ACCOUNT_COLOR_VARS.savings)}
                fillOpacity={0.2}
                strokeWidth={2}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="credit"
                name={SERIES_LABELS.credit}
                stroke={colorFromVar(ACCOUNT_COLOR_VARS.credit)}
                fill={colorFromVar(ACCOUNT_COLOR_VARS.credit)}
                fillOpacity={0.2}
                strokeWidth={2}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="investment"
                name={SERIES_LABELS.investment}
                stroke={colorFromVar(ACCOUNT_COLOR_VARS.investment)}
                fill={colorFromVar(ACCOUNT_COLOR_VARS.investment)}
                fillOpacity={0.2}
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
