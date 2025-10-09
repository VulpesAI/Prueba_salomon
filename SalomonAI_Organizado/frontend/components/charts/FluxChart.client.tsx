"use client";

import type { TooltipProps } from "recharts";
import { Area, AreaChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { FluxPoint } from "@/hooks/useDashboardOverview";
import { formatCurrencyCLP, formatDateCL } from "@/lib/formatters";
import { formatDateLabel } from "@/lib/dates";
const HIST_COLOR = "var(--accent)";
const PROJ_COLOR = "var(--success)";

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
    <div className="min-w-[220px] rounded-xl border border-app-border-subtle bg-app-card p-3 text-xs text-app shadow-lg">
      <div className="text-sm font-semibold text-app">{formatDateCL(String(label))}</div>
      <ul className="mt-2 space-y-1">
        {payload.map((entry) => (
          <li key={entry.dataKey as string} className="flex items-center justify-between gap-4">
            <span className="capitalize opacity-80">{entry.name}</span>
            <span className="font-semibold text-app">{formatCurrencyCLP(Number(entry.value))}</span>
          </li>
        ))}
      </ul>
      {meta?.payload?.model_type ? (
        <div className="mt-2 space-y-1 border-t border-app-border-subtle pt-2 text-app-dim">
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
  const chartData = mapToChartData(data);

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <AreaChart data={chartData} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="cashflowGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--border-color) 45%, transparent)" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateLabel}
            stroke="color-mix(in srgb, var(--text-muted) 90%, transparent)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            dy={8}
          />
          <YAxis
            stroke="color-mix(in srgb, var(--text-muted) 90%, transparent)"
            fontSize={12}
            tickFormatter={(value) => formatCurrencyCLP(Number(value))}
            tickLine={false}
            axisLine={false}
            width={120}
          />
          <Tooltip cursor={{ strokeDasharray: "4 4", stroke: "color-mix(in srgb, var(--border-color) 65%, transparent)" }} content={<FluxTooltip />} />
          <Legend
            formatter={(value) => value}
            iconType="circle"
            wrapperStyle={{ paddingTop: 16, fontSize: 12, color: "var(--text-muted)" }}
          />
          <Area
            type="monotone"
            dataKey="histAmount"
            name="Histórico"
            fill="url(#cashflowGradient)"
            stroke={HIST_COLOR}
            strokeWidth={2}
            dot={{ r: 2.4, strokeWidth: 1.2, stroke: HIST_COLOR, fill: "var(--bg)" }}
            activeDot={{ r: 4 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="projAmount"
            name="Proyección"
            stroke={PROJ_COLOR}
            strokeDasharray="6 6"
            strokeWidth={2.4}
            dot={{ r: 3, strokeWidth: 1, stroke: PROJ_COLOR, fill: "var(--bg)" }}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
