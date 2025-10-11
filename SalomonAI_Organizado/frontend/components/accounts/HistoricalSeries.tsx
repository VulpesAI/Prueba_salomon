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

import { formatCLP } from "@/lib/currency";
import { formatDateLabel } from "@/lib/dates";
import { ACCOUNT_COLOR_VARS, colorFromVar } from "@/lib/ui/account-colors";
import type { BalanceHistoryPoint } from "@/services/accounts";

const LABELS: Record<keyof typeof ACCOUNT_COLOR_VARS, string> = {
  checking: "Cuentas corrientes",
  savings: "Ahorro",
  credit: "Crédito",
  investment: "Inversión",
};

type HistoricalSeriesProps = {
  data: BalanceHistoryPoint[];
};

function HistLegend() {
  const keys = Object.keys(ACCOUNT_COLOR_VARS) as Array<keyof typeof ACCOUNT_COLOR_VARS>;
  return (
    <ul className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
      {keys.map((key) => {
        const color = colorFromVar(ACCOUNT_COLOR_VARS[key]);
        return (
          <li key={key} className="inline-flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span style={{ color }}>{LABELS[key]}</span>
          </li>
        );
      })}
    </ul>
  );
}

function HistTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="rounded-md border px-2 py-1 text-xs shadow"
      style={{
        background: "hsl(var(--card))",
        borderColor: "hsl(var(--border))",
        color: "hsl(var(--foreground))",
      }}
    >
      <div className="mb-1 font-medium">{formatDateLabel(String(label))}</div>
      <div className="space-y-0.5">
        {payload.map((item) => {
          const key = item.dataKey as keyof typeof ACCOUNT_COLOR_VARS;
          const colorVar = ACCOUNT_COLOR_VARS[key] ?? ACCOUNT_COLOR_VARS.checking;
          const color = colorFromVar(colorVar);
          return (
            <div key={key} className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                {LABELS[key]}
              </span>
              <span className="tabular-nums" style={{ color }}>
                {formatCLP(Number(item.value ?? 0))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function HistoricalSeries({ data }: HistoricalSeriesProps) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 65, bottom: 28 }}>
          <CartesianGrid strokeDasharray="4 4" className="stroke-border/50" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateLabel}
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            tickFormatter={(value) =>
              new Intl.NumberFormat("es-CL", { notation: "compact" }).format(Number(value))
            }
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip
            content={<HistTooltip />}
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
          <Legend content={<HistLegend />} />
          <Area
            type="monotone"
            dataKey="checking"
            stroke={colorFromVar(ACCOUNT_COLOR_VARS.checking)}
            fill={colorFromVar(ACCOUNT_COLOR_VARS.checking)}
            fillOpacity={0.2}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="savings"
            stroke={colorFromVar(ACCOUNT_COLOR_VARS.savings)}
            fill={colorFromVar(ACCOUNT_COLOR_VARS.savings)}
            fillOpacity={0.2}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="credit"
            stroke={colorFromVar(ACCOUNT_COLOR_VARS.credit)}
            fill={colorFromVar(ACCOUNT_COLOR_VARS.credit)}
            fillOpacity={0.2}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="investment"
            stroke={colorFromVar(ACCOUNT_COLOR_VARS.investment)}
            fill={colorFromVar(ACCOUNT_COLOR_VARS.investment)}
            fillOpacity={0.2}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
