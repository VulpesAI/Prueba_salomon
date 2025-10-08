"use client";

import type { TooltipProps } from "recharts";
import { Area, AreaChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { FluxPoint } from "@/hooks/useDashboardOverview";
import { formatCLP } from "@/lib/currency";
import { formatDateLabel } from "@/lib/dates";

const HIST_COLOR = "#38bdf8";
const PROJ_COLOR = "#f97316";

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
    <div className="rounded-lg border bg-background p-3 text-xs shadow">
      <div className="font-medium">{formatDateLabel(String(label))}</div>
      <ul className="mt-2 space-y-1">
        {payload.map((entry) => (
          <li key={entry.dataKey as string} className="flex items-center justify-between gap-4">
            <span className="capitalize opacity-80">{entry.name}</span>
            <span className="font-medium">{formatCLP(Number(entry.value))}</span>
          </li>
        ))}
      </ul>
      {meta?.payload?.model_type ? (
        <div className="mt-2 space-y-1 border-t pt-2 opacity-70">
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
    <div className="h-60 w-full">
      <ResponsiveContainer>
        <AreaChart data={chartData} margin={{ top: 12, right: 18, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
          <XAxis dataKey="date" tickFormatter={formatDateLabel} stroke="currentColor" fontSize={12} />
          <YAxis stroke="currentColor" fontSize={12} tickFormatter={(value) => formatCLP(Number(value))} width={120} />
          <Tooltip content={<FluxTooltip />} />
          <Legend formatter={(value) => value} />
          <Area
            type="monotone"
            dataKey="histAmount"
            name="Histórico"
            fill={`${HIST_COLOR}33`}
            stroke={HIST_COLOR}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="projAmount"
            name="Proyección"
            stroke={PROJ_COLOR}
            strokeDasharray="5 5"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
