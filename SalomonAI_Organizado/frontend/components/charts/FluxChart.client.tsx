"use client";

import { useId, useMemo } from "react";
import type { TooltipProps } from "recharts";
import { Area, AreaChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { FluxPoint } from "@/hooks/useDashboardOverview";
import { formatCLP, formatDateCL } from "@/lib/formatters";
import { formatDateLabel } from "@/lib/dates";
import { getChartVars, type ChartVars } from "@/lib/chartTheme";

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

function FluxTooltip(props: TooltipProps<number, string> & { vars: ChartVars }) {
  const { active, payload, label } = props;

  if (!active || !payload?.length) {
    return null;
  }

  const meta = payload.find((item) => item.payload?.model_type);

  return (
    <div
      className="min-w-[220px] rounded-xl border p-4 text-xs shadow-sm"
      style={{
        background: props.vars.CARD,
        borderColor: props.vars.BORDER,
        color: props.vars.TEXT,
      }}
    >
      <div className="text-sm font-semibold" style={{ color: props.vars.TEXT }}>
        {formatDateCL(String(label))}
      </div>
      <ul className="mt-3 space-y-1.5">
        {payload.map((entry) => (
          <li key={entry.dataKey as string} className="flex items-center justify-between gap-4">
            <span className="capitalize" style={{ color: props.vars.MUTED }}>
              {entry.name}
            </span>
            <span className="font-semibold" style={{ color: props.vars.TEXT }}>
              {formatCLP(Number(entry.value))}
            </span>
          </li>
        ))}
      </ul>
      {meta?.payload?.model_type ? (
        <div
          className="mt-3 space-y-1 border-t pt-3"
          style={{ borderColor: props.vars.BORDER, color: props.vars.MUTED }}
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
  const chartVars = useMemo(() => getChartVars(), []);

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
              <stop offset="0%" stopColor={chartVars.ACCENT} stopOpacity={0.24} />
              <stop offset="100%" stopColor={chartVars.ACCENT} stopOpacity={0.06} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={`color-mix(in srgb, ${chartVars.BORDER} 45%, transparent)`}
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateLabel}
            tick={{ fill: chartVars.MUTED, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            dy={8}
            ticks={ticks}
            minTickGap={16}
            interval={0}
          />
          <YAxis
            tick={{ fill: chartVars.MUTED, fontSize: 12 }}
            tickFormatter={(value) => formatCLP(Number(value))}
            tickLine={false}
            axisLine={false}
            width={120}
          />
          <Tooltip
            cursor={{ strokeDasharray: "4 4", stroke: `color-mix(in srgb, ${chartVars.BORDER} 60%, transparent)` }}
            content={<FluxTooltip vars={chartVars} />}
            contentStyle={{
              background: chartVars.CARD,
              borderColor: chartVars.BORDER,
              borderRadius: "0.75rem",
              color: chartVars.TEXT,
            }}
            labelStyle={{ color: chartVars.TEXT }}
            itemStyle={{ color: chartVars.TEXT }}
            wrapperStyle={{ outline: "none" }}
          />
          <Legend
            formatter={(value) => value}
            iconType="circle"
            wrapperStyle={{ paddingTop: 16, fontSize: 12, color: chartVars.MUTED }}
          />
          <Area
            type="monotone"
            dataKey="histAmount"
            name="Histórico"
            fill={`url(#${gradientId})`}
            stroke={chartVars.ACCENT}
            strokeWidth={2.4}
            dot={{ r: 2.4, strokeWidth: 1.2, stroke: chartVars.ACCENT, fill: chartVars.CARD }}
            activeDot={{ r: 4 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="projAmount"
            name="Proyección"
            stroke={chartVars.SUCCESS}
            strokeDasharray="6 6"
            strokeWidth={2.2}
            dot={{ r: 3, strokeWidth: 1, stroke: chartVars.SUCCESS, fill: chartVars.CARD }}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
