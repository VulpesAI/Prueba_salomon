"use client";

import { useId, useMemo } from "react";
import type { TooltipProps } from "recharts";
import { Area, AreaChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { FluxPoint } from "@/hooks/useDashboardOverview";
import { formatCurrencyCLP, formatDateCL } from "@/lib/formatters";
import { formatDateLabel } from "@/lib/dates";
const FALLBACK_TOKENS = {
  accent: "#007CF0",
  success: "#22C55E",
  dim: "#94A3B8",
  text: "#081134",
  border: "rgba(148, 163, 184, 0.32)",
  card: "#FFFFFF",
};

type ChartDatum = {
  date: string;
  label: string;
  histAmount: number | null;
  projAmount: number | null;
  model_type?: string;
  calculated_at?: string;
};

function mapToChartData(data: FluxPoint[]): ChartDatum[] {
  return data.map((point) => ({
    date: point.date,
    label: formatDateLabel(point.date),
    histAmount: point.type === "hist" ? point.amount : null,
    projAmount: point.type === "proj" ? point.amount : null,
    model_type: point.model_type,
    calculated_at: point.calculated_at,
  }));
}

function FluxTooltip(props: TooltipProps<number, string>) {
  const { active, payload, label } = props;

  if (!active || !payload?.length) {
    return null;
  }

  const meta = payload.find((item) => item.payload?.model_type);

  return (
    <div
      className="min-w-[220px] rounded-xl border p-4 text-xs shadow-sm"
      style={{
        background: "hsl(var(--card))",
        borderColor: "hsl(var(--border))",
        color: "hsl(var(--foreground))",
      }}
    >
      <div className="text-sm font-semibold text-foreground">{formatDateCL(String(label))}</div>
      <ul className="mt-3 space-y-1.5">
        {payload.map((entry) => (
          <li key={entry.dataKey as string} className="flex items-center justify-between gap-4">
            <span className="capitalize text-muted-foreground">{entry.name}</span>
            <span className="font-semibold text-foreground">{formatCurrencyCLP(Number(entry.value))}</span>
          </li>
        ))}
      </ul>
      {meta?.payload?.model_type ? (
        <div
          className="mt-3 space-y-1 border-t pt-3 text-muted-foreground"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          <div>Modelo: {meta.payload.model_type}</div>
          {meta.payload.calculated_at ? (
            <div>Calculado: {new Date(meta.payload.calculated_at).toLocaleString("es-CL")}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function FluxChart({ data }: { data: FluxPoint[] }) {
  const gradientId = useId();
  const chartData = useMemo(() => mapToChartData(data), [data]);
  const palette = useMemo(() => {
    if (typeof window === "undefined") {
      return FALLBACK_TOKENS;
    }
    const styles = getComputedStyle(document.documentElement);
    return {
      accent: styles.getPropertyValue("--accent").trim() || FALLBACK_TOKENS.accent,
      success: styles.getPropertyValue("--success").trim() || FALLBACK_TOKENS.success,
      dim: styles.getPropertyValue("--text-muted").trim() || FALLBACK_TOKENS.dim,
      text: styles.getPropertyValue("--text").trim() || FALLBACK_TOKENS.text,
      border: styles.getPropertyValue("--border-color").trim() || FALLBACK_TOKENS.border,
      card: styles.getPropertyValue("--card-surface").trim() || FALLBACK_TOKENS.card,
    };
  }, []);

  const ticks = useMemo(() => {
    if (chartData.length <= 4) {
      return chartData.map((point) => point.date);
    }
    const step = Math.max(1, Math.floor(chartData.length / 4));
    const result: string[] = [];
    for (let index = 0; index < chartData.length; index += step) {
      result.push(chartData[index]?.date ?? "");
    }
    if (!result.includes(chartData[chartData.length - 1]?.date ?? "")) {
      result.push(chartData[chartData.length - 1]?.date ?? "");
    }
    return result;
  }, [chartData]);

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <AreaChart data={chartData} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={palette.accent} stopOpacity={0.24} />
              <stop offset="100%" stopColor={palette.accent} stopOpacity={0.06} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={`color-mix(in srgb, ${palette.border} 45%, transparent)`} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateLabel}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            dy={8}
            ticks={ticks}
            minTickGap={16}
            interval={0}
          />
          <YAxis
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            tickFormatter={(value) => formatCurrencyCLP(Number(value))}
            tickLine={false}
            axisLine={false}
            width={120}
          />
          <Tooltip
            cursor={{ strokeDasharray: "4 4", stroke: `color-mix(in srgb, ${palette.border} 60%, transparent)` }}
            content={<FluxTooltip />}
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
          <Legend
            formatter={(value) => value}
            iconType="circle"
            wrapperStyle={{ paddingTop: 16, fontSize: 12, color: "hsl(var(--muted-foreground))" }}
          />
          <Area
            type="monotone"
            dataKey="histAmount"
            name="Histórico"
            fill={`url(#${gradientId})`}
            stroke={palette.accent}
            strokeWidth={2.4}
            dot={{ r: 2.4, strokeWidth: 1.2, stroke: palette.accent, fill: "var(--bg)" }}
            activeDot={{ r: 4 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="projAmount"
            name="Proyección"
            stroke={palette.success}
            strokeDasharray="6 6"
            strokeWidth={2.2}
            dot={{ r: 3, strokeWidth: 1, stroke: palette.success, fill: "var(--bg)" }}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
